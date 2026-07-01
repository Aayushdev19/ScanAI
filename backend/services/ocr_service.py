import easyocr
import numpy as np
from PIL import Image
import io
from pathlib import Path

_reader = None
MODEL_DIR = Path("local_data/easyocr_models")

def _get_reader() -> easyocr.Reader:
    global _reader
    if _reader is None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        _reader = easyocr.Reader(
            ["en"],
            gpu=False,
            verbose=False,
            model_storage_directory=str(MODEL_DIR),
            user_network_directory=str(MODEL_DIR),
        )
    return _reader

def extract_text(img_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img_array = np.array(img)

    try:
        reader = _get_reader()
    except RuntimeError as exc:
        if "not enough memory" in str(exc).lower():
            raise RuntimeError(
                "OCR engine ran out of memory while loading EasyOCR models. "
                "Close other apps or run backend on a machine with more RAM."
            ) from exc
        raise
    results = reader.readtext(img_array)

    if not results:
        return {"extracted_text": "", "ocr_confidence": 0.0}

    lines = [text for (_, text, _) in results]
    confidences = [conf for (_, _, conf) in results]

    return {
        "extracted_text": "\n".join(lines),
        "ocr_confidence": round(sum(confidences) / len(confidences) * 100, 2),
    }
