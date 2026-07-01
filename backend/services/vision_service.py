import cv2
import numpy as np
from PIL import Image
import io
from typing import Tuple

try:
    from ml.predict import predict_bytes
except Exception:
    predict_bytes = None


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return float(max(low, min(high, value)))


def _open_image(img_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def _image_array(img_bytes: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Unable to decode image")
    return img


def _ela_metrics(img_bytes: bytes) -> dict:
    """
    Error Level Analysis: re-save at known quality and measure difference.
    High or highly concentrated residuals can indicate editing or re-export.
    """
    img = _open_image(img_bytes)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")

    orig = np.array(img, dtype=np.float32)
    recomp = np.array(recompressed, dtype=np.float32)
    residual = np.mean(np.abs(orig - recomp), axis=2)
    mean = float(np.mean(residual) / 255.0)
    p95 = float(np.percentile(residual, 95) / 255.0)
    std = float(np.std(residual) / 255.0)
    high_ratio = float(np.mean(residual > 18.0))

    return {
        "mean": mean,
        "p95": p95,
        "std": std,
        "high_ratio": high_ratio,
        "score": _clamp((mean * 16.0) + (p95 * 4.0) + (std * 8.0) + (high_ratio * 2.5)),
    }


def _texture_metrics(img_bytes: bytes) -> dict:
    """
    Estimate texture, edge, and tonal complexity. These are not a substitute
    for a trained model, but they catch more suspicious synthetic/re-exported
    images than a single ELA threshold.
    """
    img = _image_array(img_bytes)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    edges = cv2.Canny(gray, 80, 180)
    edge_density = float(np.mean(edges > 0))

    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).ravel()
    probs = hist / max(float(hist.sum()), 1.0)
    probs = probs[probs > 0]
    entropy = float(-np.sum(probs * np.log2(probs)) / 8.0)

    local_std = cv2.blur((gray.astype(np.float32) - cv2.blur(gray.astype(np.float32), (9, 9))) ** 2, (9, 9))
    local_std = np.maximum(local_std, 0)
    texture_uniformity = 1.0 - _clamp(float(np.std(np.sqrt(local_std))) / 45.0)
    smoothness = 1.0 - _clamp(laplacian_var / 750.0)
    saturation = float(np.mean(hsv[:, :, 1]) / 255.0)

    ai_score = _clamp(
        smoothness * 0.34
        + texture_uniformity * 0.28
        + (1.0 - _clamp(edge_density / 0.12)) * 0.22
        + saturation * 0.08
        + (1.0 - entropy) * 0.08
    )

    return {
        "laplacian_var": laplacian_var,
        "edge_density": edge_density,
        "entropy": entropy,
        "texture_uniformity": texture_uniformity,
        "smoothness": smoothness,
        "saturation": saturation,
        "ai_score": ai_score,
    }


def _metadata_check(img_bytes: bytes) -> Tuple[str, str, float]:
    """Check for EXIF data presence."""
    img = Image.open(io.BytesIO(img_bytes))
    exif = img._getexif() if hasattr(img, "_getexif") else None
    if exif:
        make = exif.get(271)
        model = exif.get(272)
        captured_at = exif.get(36867) or exif.get(306)
        if make or model or captured_at:
            camera_parts = [str(part).strip() for part in [make, model] if part]
            camera_name = " ".join(camera_parts) or "camera"
            return "Original", f"Camera EXIF detected from {camera_name}.", 0.0
        return "Embedded", "EXIF exists, but no camera make/model or capture timestamp was found.", 0.1
    return "Missing", "No EXIF metadata found - possible re-export, screenshot, or stripped metadata.", 0.18


def _format_check(img_bytes: bytes) -> Tuple[str, str, float]:
    img = Image.open(io.BytesIO(img_bytes))
    image_format = (img.format or "UNKNOWN").upper()
    if image_format in {"JPEG", "JPG"}:
        return "Camera-like", f"{image_format} container is typical for camera photos.", 0.0
    if image_format in {"PNG", "WEBP"}:
        return "Re-encoded", f"{image_format} container is common for exports, screenshots, and generated images.", 0.12
    return "Uncommon", f"{image_format} container needs manual review.", 0.08


def _risk_label(score: float) -> str:
    if score >= 0.72:
        return "Critical"
    if score >= 0.52:
        return "High"
    if score >= 0.34:
        return "Medium"
    return "Minimal"


def _display_ai_probability(ai_score: float, verdict: str) -> float:
    if verdict == "AI GENERATED":
        return round(ai_score * 100, 1)
    if verdict == "MANIPULATED":
        return round(min(ai_score * 70.0, 55.0), 1)
    return round(min(ai_score * 65.0, 49.0), 1)


def _model_verdict(label: str) -> str:
    mapping = {
        "authentic": "AUTHENTIC",
        "ai_generated": "AI GENERATED",
        "manipulated": "MANIPULATED",
    }
    return mapping.get(label, "AUTHENTIC")


def _is_uncertain_case(
    verdict: str,
    manipulation_score: float,
    ai_score: float,
    risk_score: float,
    prediction: dict | None,
    camera_evidence: bool,
) -> bool:
    if verdict == "MANIPULATED" and manipulation_score >= 0.58:
        return False
    if verdict == "AI GENERATED" and ai_score >= 0.78 and not camera_evidence:
        return False
    if not prediction:
        return 0.34 <= risk_score < 0.72

    model_verdict = _model_verdict(prediction["label"])
    confidence = float(prediction["confidence"])
    scores = prediction.get("scores", {})
    ai_confidence = float(scores.get("ai_generated", 0.0))
    authentic_confidence = float(scores.get("authentic", 0.0))
    model_margin = abs(ai_confidence - authentic_confidence)

    if confidence < 0.68:
        return True
    if model_margin < 0.22 and risk_score >= 0.34:
        return True
    if verdict == "AUTHENTIC" and authentic_confidence < 0.72:
        return True
    if model_verdict == "AI GENERATED" and camera_evidence and ai_confidence < 0.76:
        return True
    if model_verdict == "AUTHENTIC" and ai_score >= 0.62:
        return True
    if verdict == "AUTHENTIC" and risk_score < 0.28 and ai_score < 0.46:
        return False
    return False


def _ml_prediction(img_bytes: bytes) -> dict | None:
    if predict_bytes is None:
        return None
    try:
        return predict_bytes(img_bytes)
    except Exception:
        return None


def _fuse_ml_prediction(
    verdict: str,
    risk_score: float,
    ai_score: float,
    prediction: dict | None,
    camera_evidence: bool = False,
):
    if not prediction:
        return verdict, risk_score, ai_score

    model_verdict = _model_verdict(prediction["label"])
    confidence = float(prediction["confidence"])
    scores = prediction.get("scores", {})
    ai_confidence = float(scores.get("ai_generated", 0.0))
    authentic_confidence = float(scores.get("authentic", 0.0))
    ai_threshold = 0.68 if camera_evidence else 0.50

    if model_verdict == "AI GENERATED" and ai_confidence >= ai_threshold:
        verdict = "AI GENERATED"
        ai_score = max(ai_score, ai_confidence)
        risk_score = max(risk_score, ai_confidence)
    elif model_verdict == "AUTHENTIC" and authentic_confidence >= 0.84 and ai_score < 0.58 and risk_score < 0.46:
        verdict = "AUTHENTIC"
        risk_score = min(risk_score, max(0.08, 1.0 - authentic_confidence))
    elif confidence >= 0.72:
        verdict = model_verdict
        if model_verdict == "AUTHENTIC":
            risk_score = min(risk_score, max(0.08, 1.0 - confidence))
        else:
            risk_score = max(risk_score, confidence)
            if model_verdict == "AI GENERATED":
                ai_score = max(ai_score, confidence)
    elif confidence >= 0.58 and model_verdict != "AUTHENTIC":
        risk_score = max(risk_score, confidence * 0.72)
        if risk_score >= 0.46:
            verdict = model_verdict
        if model_verdict == "AI GENERATED":
            ai_score = max(ai_score, confidence * 0.8)

    return verdict, risk_score, ai_score


def analyze_image(img_bytes: bytes) -> dict:
    ela = _ela_metrics(img_bytes)
    texture = _texture_metrics(img_bytes)
    meta_status, meta_detail, meta_penalty = _metadata_check(img_bytes)
    format_status, format_detail, format_penalty = _format_check(img_bytes)

    manipulation_score = _clamp(ela["score"] * 0.76 + meta_penalty + format_penalty)
    ai_score = _clamp(texture["ai_score"] * 0.82 + meta_penalty * 0.55 + format_penalty * 0.55)
    camera_evidence = meta_status == "Original" and format_status == "Camera-like" and ela["score"] < 0.16

    if camera_evidence:
        ai_score = _clamp(ai_score * 0.58)

    # Decision logic
    ai_verdict_threshold = 0.82 if camera_evidence else 0.76
    if ai_score >= ai_verdict_threshold and ai_score >= manipulation_score * 0.88:
        verdict = "AI GENERATED"
        risk_score = ai_score
    elif manipulation_score >= 0.46:
        verdict = "MANIPULATED"
        risk_score = manipulation_score
    else:
        verdict = "AUTHENTIC"
        risk_score = max(manipulation_score, ai_score * 0.38)

    ml_prediction = _ml_prediction(img_bytes)
    verdict, risk_score, ai_score = _fuse_ml_prediction(verdict, risk_score, ai_score, ml_prediction, camera_evidence)

    if _is_uncertain_case(verdict, manipulation_score, ai_score, risk_score, ml_prediction, camera_evidence):
        verdict = "REVIEW NEEDED"
        risk_score = min(max(risk_score, 0.42), 0.51)

    trust_score = round((1.0 - risk_score) * 100, 1)
    risk_profile = _risk_label(risk_score)
    ai_probability = _display_ai_probability(ai_score, verdict)

    forensic_checks = [
        {
            "label": "Pixel Texture Mapping",
            "status": "Optimal" if texture["ai_score"] < 0.42 else "Anomalous",
            "details": (
                f"Texture score {texture['ai_score']:.1%}; edges and local variance look natural."
                if texture["ai_score"] < 0.42
                else f"Texture score {texture['ai_score']:.1%}; unusually smooth or uniform regions detected."
            ),
        },
        {
            "label": "Metadata Fingerprint",
            "status": meta_status,
            "details": meta_detail,
        },
        {
            "label": "Compression Matrix",
            "status": "Consistent" if ela["score"] < 0.36 else "Inconsistent",
            "details": (
                f"ELA score {ela['score']:.1%}; compression residuals are within expected range."
                if ela["score"] < 0.36
                else f"ELA score {ela['score']:.1%}; concentrated residuals suggest editing or re-export."
            ),
        },
        {
            "label": "Container Profile",
            "status": format_status,
            "details": format_detail,
        },
        {
            "label": "Forensic Risk Fusion",
            "status": "Low" if risk_score < 0.34 else "Elevated",
            "details": f"Manipulation score {manipulation_score:.1%}; AI-generation score {ai_score:.1%}.",
        },
    ]
    if ml_prediction:
        model_label = _model_verdict(ml_prediction["label"])
        model_conf = float(ml_prediction["confidence"])
        forensic_checks.append(
            {
                "label": "Trained Model",
                "status": model_label,
                "details": f"EfficientNet prediction {model_label} with {model_conf:.1%} confidence.",
            }
        )
    else:
        forensic_checks.append(
            {
                "label": "Trained Model",
                "status": "Not Loaded",
                "details": "No trained model file found at backend/ml/models/scanai_model.pt; heuristic checks were used.",
            }
        )

    return {
        "verdict": verdict,
        "trust_score": trust_score,
        "risk_profile": risk_profile,
        "ai_probability": ai_probability,
        "forensic_checks": forensic_checks,
    }
