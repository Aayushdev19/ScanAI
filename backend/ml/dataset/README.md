# ScanAI Dataset Folder

Upload images into this structure:

```text
dataset/
  train/
    authentic/
    ai_generated/
    manipulated/
  val/
    authentic/
    ai_generated/
    manipulated/
  test/
    authentic/
    ai_generated/
    manipulated/
```

Use `train` for learning, `val` for tuning during training, and `test` only for final evaluation.

Recommended first target:

```text
train: 500+ images per class
val:   100+ images per class
test:  100+ images per class
```

Accepted image types:

```text
.jpg
.jpeg
.png
.webp
.bmp
.tiff
```

Do not put the same image in multiple folders.
