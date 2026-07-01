import argparse
import copy
import os
from pathlib import Path

os.environ.setdefault("TORCH_HOME", str(Path(__file__).resolve().parent / "models" / "torch_cache"))

import torch
from torch import nn, optim
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, **_kwargs):
        return iterable


DEFAULT_CLASS_NAMES = ["authentic", "ai_generated", "manipulated"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
IMAGE_SIZE = 224


def build_transforms():
    train_tfms = transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(8),
            transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.08),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    eval_tfms = transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return train_tfms, eval_tfms


def _image_files(folder: Path):
    if not folder.exists():
        return []
    return sorted(path for path in folder.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS)


def discover_classes(data_dir: Path, requested_classes: list[str] | None = None):
    candidate_classes = requested_classes or DEFAULT_CLASS_NAMES
    usable_classes = []

    for class_name in candidate_classes:
        train_count = len(_image_files(data_dir / "train" / class_name))
        val_count = len(_image_files(data_dir / "val" / class_name))
        if train_count > 0 and val_count > 0:
            usable_classes.append(class_name)
        else:
            print(
                f"Skipping class '{class_name}' "
                f"(train images: {train_count}, val images: {val_count})"
            )

    if len(usable_classes) < 2:
        raise ValueError("Need at least two classes with images in both train/ and val/.")
    return usable_classes


def validate_dataset(data_dir: Path, class_names: list[str]):
    for split in ["train", "val"]:
        split_dir = data_dir / split
        if not split_dir.exists():
            raise FileNotFoundError(f"Missing dataset split: {split_dir}")
        for class_name in class_names:
            class_dir = split_dir / class_name
            if not class_dir.exists():
                raise FileNotFoundError(f"Missing class folder: {class_dir}")
            if not _image_files(class_dir):
                raise FileNotFoundError(f"No images found in class folder: {class_dir}")


class ScanAIDataset(Dataset):
    def __init__(self, root: Path, class_names: list[str], transform):
        self.root = root
        self.class_names = class_names
        self.transform = transform
        self.samples = []

        for label, class_name in enumerate(class_names):
            for path in _image_files(root / class_name):
                self.samples.append((path, label))

        if not self.samples:
            raise ValueError(f"No images found in {root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]
        with Image.open(path) as image:
            image = image.convert("RGB")
        return self.transform(image), label


def build_loaders(data_dir: Path, class_names: list[str], batch_size: int, workers: int):
    train_tfms, eval_tfms = build_transforms()
    train_ds = ScanAIDataset(data_dir / "train", class_names, transform=train_tfms)
    val_ds = ScanAIDataset(data_dir / "val", class_names, transform=eval_tfms)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=workers)
    return train_loader, val_loader


def build_model(num_classes: int):
    weights = models.EfficientNet_B0_Weights.DEFAULT
    model = models.efficientnet_b0(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def run_epoch(model, loader, criterion, optimizer, device, train: bool):
    model.train(train)
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.set_grad_enabled(train):
        for images, labels in tqdm(loader, leave=False):
            images = images.to(device)
            labels = labels.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            correct += (logits.argmax(dim=1) == labels).sum().item()
            total += labels.size(0)

    return total_loss / max(total, 1), correct / max(total, 1)


def save_checkpoint(path: Path, model, class_names, best_val_acc: float):
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_name": "efficientnet_b0",
            "image_size": IMAGE_SIZE,
            "class_names": class_names,
            "state_dict": model.state_dict(),
            "best_val_acc": best_val_acc,
        },
        path,
    )


def main():
    parser = argparse.ArgumentParser(description="Train ScanAI image authenticity model.")
    parser.add_argument("--data", required=True, help="Dataset root containing train/ and val/ folders.")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--output", default="models/scanai_model.pt")
    parser.add_argument(
        "--classes",
        nargs="+",
        default=None,
        help="Optional class list. Default auto-detects usable classes from authentic, ai_generated, manipulated.",
    )
    args = parser.parse_args()

    data_dir = Path(args.data)
    output_path = Path(args.output)
    class_names = discover_classes(data_dir, args.classes)
    validate_dataset(data_dir, class_names)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    print(f"Training classes: {class_names}")

    train_loader, val_loader = build_loaders(data_dir, class_names, args.batch_size, args.workers)
    model = build_model(num_classes=len(class_names)).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)

    best_val_acc = 0.0
    best_state = copy.deepcopy(model.state_dict())

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_acc = run_epoch(model, val_loader, criterion, optimizer, device, train=False)

        print(
            f"Epoch {epoch:02d}/{args.epochs} "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.3f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.3f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = copy.deepcopy(model.state_dict())
            save_checkpoint(output_path, model, class_names, best_val_acc)
            print(f"Saved new best model to {output_path}")

    model.load_state_dict(best_state)
    save_checkpoint(output_path, model, class_names, best_val_acc)
    print(f"Training complete. Best validation accuracy: {best_val_acc:.3f}")
    print(f"Model saved to: {output_path.resolve()}")


if __name__ == "__main__":
    main()
