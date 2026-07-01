import argparse
import json
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image


MODEL_PATH = Path(__file__).resolve().parent / "models" / "scanai_model.pt"
DEFAULT_CLASS_NAMES = ["authentic", "ai_generated", "manipulated"]


def _load_torch():
    try:
        import torch
        from torch import nn
        from torchvision import models, transforms
    except Exception:
        return None
    return torch, nn, models, transforms


def _build_model(models, nn, num_classes: int):
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


@lru_cache(maxsize=1)
def load_model(model_path: str = str(MODEL_PATH)):
    torch_libs = _load_torch()
    if torch_libs is None:
        return None
    torch, nn, models, transforms = torch_libs

    path = Path(model_path)
    if not path.exists():
        return None

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = torch.load(path, map_location=device)
    class_names = checkpoint.get("class_names", DEFAULT_CLASS_NAMES)
    image_size = checkpoint.get("image_size", 224)

    model = _build_model(models, nn, len(class_names))
    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()

    transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return {
        "torch": torch,
        "device": device,
        "model": model,
        "transform": transform,
        "class_names": class_names,
    }


def predict_image(image: Image.Image, model_path: str = str(MODEL_PATH)) -> Optional[dict]:
    bundle = load_model(model_path)
    if bundle is None:
        return None

    torch = bundle["torch"]
    image = image.convert("RGB")
    tensor = bundle["transform"](image).unsqueeze(0).to(bundle["device"])

    with torch.no_grad():
        logits = bundle["model"](tensor)
        probs = torch.softmax(logits, dim=1)[0].detach().cpu().tolist()

    class_names = bundle["class_names"]
    best_index = max(range(len(probs)), key=lambda idx: probs[idx])
    scores = {class_names[idx]: round(float(score), 4) for idx, score in enumerate(probs)}
    return {
        "label": class_names[best_index],
        "confidence": round(float(probs[best_index]), 4),
        "scores": scores,
    }


def predict_bytes(img_bytes: bytes, model_path: str = str(MODEL_PATH)) -> Optional[dict]:
    image = Image.open(BytesIO(img_bytes))
    return predict_image(image, model_path)


def main():
    parser = argparse.ArgumentParser(description="Run ScanAI model prediction on one image.")
    parser.add_argument("--image", required=True)
    parser.add_argument("--model", default=str(MODEL_PATH))
    args = parser.parse_args()

    with Image.open(args.image) as image:
        result = predict_image(image, args.model)

    if result is None:
        raise SystemExit(f"No model found at {args.model}. Train first, then try again.")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
