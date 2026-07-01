# ScanAI Final Project Report

## Project Summary

ScanAI is an AI-powered image verification and OCR dashboard. The application allows users to register, log in, upload images, run authenticity checks, extract OCR text, view scan history, and inspect dashboard/analytics summaries.

The project is currently a working local MVP. The frontend and backend are connected, authentication works, scans are stored locally, and image/OCR processing runs through the FastAPI backend.

## Current Status

Current phase: Phase 6 - Testing and Optimization

The core MVP is complete. The remaining work is mainly improving detection accuracy, adding production storage/database services, expanding tests, and deploying the system.

## Completed Work

### Phase 1: Research and Planning

Completed:

- Finalized the project idea: AI-powered image authenticity verification and OCR extraction.
- Planned the architecture:
  - React frontend
  - FastAPI backend
  - JWT authentication
  - local JSON database for development
  - optional MongoDB for production
  - OCR service
  - image authenticity service
  - future PyTorch model integration

### Phase 2: Frontend Development

Completed:

- Login and signup page.
- Main app layout with sidebar and navbar.
- Dashboard page.
- Workspace upload page.
- History page.
- Analytics page.
- Profile page.
- Tailwind-based UI components.
- Frontend API integration.
- Dashboard quick-upload area.
- Working navbar search dropdown.
- History search by file name.
- Improved scan error display.

Remaining:

- Final responsive testing on mobile/tablet.
- Production UI cleanup.
- Better empty/loading/error states across all pages.
- Improve accessibility labels and keyboard navigation.

### Phase 3: Backend API Development

Completed:

- FastAPI backend.
- Health endpoint:
  - `/health`
- Authentication endpoints:
  - `/auth/register`
  - `/auth/login`
  - `/auth/me`
- Scan endpoints:
  - `/scan/upload`
  - `/scan/result/{scan_id}`
  - `/scan/history`
- JWT authentication.
- Password hashing with bcrypt.
- Background scan processing.
- Upload validation for image type and file size.
- CORS configuration.

Remaining:

- Add stronger validation for edge cases.
- Add rate limiting.
- Add centralized error handling/logging.
- Expand automated API test coverage for additional edge cases.

### Phase 4: AI/ML Integration

Completed:

- OpenCV/PIL image authenticity heuristic scanner.
- Error Level Analysis style scoring.
- Texture, edge, entropy, metadata, and container checks.
- Improved scoring so results do not default mostly to authentic.
- EasyOCR text extraction.
- OCR confidence scoring.
- PyTorch training scaffold:
  - `backend/ml/train_model.py`
  - `backend/ml/predict.py`
  - `backend/ml/README.md`
- First binary EfficientNet-B0 model trained:
  - classes: `authentic`, `ai_generated`
  - saved at `backend/ml/models/scanai_model.pt`
- Retrained binary EfficientNet-B0 model with expanded dataset:
  - validation accuracy: 90.9%
  - raw model test accuracy: 92.4% (2869/3104)
  - authentic test accuracy: 95.7% (1601/1673)
  - AI-generated test accuracy: 88.6% (1268/1431)
- Optional backend model hook:
  - if `backend/ml/models/scanai_model.pt` exists, the backend uses it with the heuristic checks.
  - if no model exists, the backend still works with heuristics.

Remaining:

- Collect more and better balanced images.
- Train a stronger model for more epochs.
- Evaluate model accuracy with a separate test set.
- Add confusion matrix and classification report.
- Tune model + heuristic fusion.
- Add manipulated-image dataset support.

### Phase 5: Database and Storage

Completed:

- Local JSON database fallback.
- User storage.
- Scan result storage.
- Fixed backend errors caused by MongoDB not running locally.
- Added environment config for local/MongoDB backend selection.

Remaining:

- Connect MongoDB Atlas or local MongoDB for production.
- Add file storage for original uploads:
  - Cloudinary
  - Firebase Storage
  - AWS S3
- Store uploaded file references instead of only scan metadata.
- Add database indexes for production.

### Phase 6: Testing and Optimization

Completed:

- Backend smoke test passes.
- Automated API test suite passes.
- Frontend production build passes.
- Register/login/auth restore tested.
- Upload flow tested.
- Dashboard quick upload tested by build verification.
- Backend health check tested.
- Fixed API port/proxy issues.
- Fixed failed fetch behavior.

Remaining:

- Test with many real images:
  - real camera photos
  - AI-generated images
  - screenshots
  - edited/manipulated images
  - documents for OCR
- Test OCR on multiple document types.
- Add more backend tests for storage, MongoDB, and deployment-specific behavior.
- Add frontend interaction tests.
- Optimize large frontend bundle size.
- Measure backend scan performance.


### Phase 7: Deployment

Status: Not started

Remaining:

- Push project to GitHub.
- Deploy frontend to Vercel or Netlify.
- Deploy backend to Render, Railway, AWS, or similar.
- Connect MongoDB Atlas.
- Configure production environment variables.
- Configure production CORS.
- Use a strong production `JWT_SECRET`.
- Configure persistent file storage.
- Use `DEPLOYMENT.md` as the deployment checklist.

## Current Features

- User signup and login.
- Token-based session restore.
- Protected app routes.
- Dashboard summary cards.
- Dashboard quick image upload.
- Workspace image upload.
- Authenticity scanning mode.
- OCR extraction mode.
- Scan result polling.
- Scan history.
- Analytics charts.
- Profile avatar handling.
- Search in navbar and history.
- CSV export from history.
- Local development database.
- Optional ML model integration path.

## What Still Remains To Complete The Project

Highest priority remaining work:

1. Add more training images.
2. Improve the first binary image authenticity model.
3. Add production database with MongoDB Atlas.
4. Add production file storage.
5. Expand automated tests.
6. Deploy frontend and backend.
7. Tune UI and responsive behavior.
8. Improve OCR reliability on low-memory machines.

## Model Training Recommendation

### Recommended First Model

Use EfficientNet-B0 with transfer learning.

Reason:

- It is lighter than large vision transformers.
- It works well for image classification.
- It is easier to train on Google Colab.
- It can run locally for inference more easily than heavier models.
- The project already includes an EfficientNet-B0 training script.

### Recommended Class Setup

Final target classes:

```text+
authentic
ai_generated
manipulated
```

However, training should happen in stages.

### Stage 1: Binary Model

Train first on:

```text
authentic
ai_generated
```

Reason:

- The dataset you found appears to be for AI-generated vs human-generated images.
- This is easier than solving all 3 classes immediately.
- It gives ScanAI a real trained model faster.

Current status: completed and improved with the expanded dataset.

```text
model: backend/ml/models/scanai_model.pt
classes: authentic, ai_generated
epochs: 10
validation accuracy: 90.9%
test accuracy: 92.4% (2869/3104)
```

Dataset format:

```text
dataset/
  train/
    authentic/
    ai_generated/
  val/
    authentic/
    ai_generated/
  test/
    authentic/
    ai_generated/
```

Important: the current training script expects 3 classes. If we start with a binary dataset, update `CLASS_NAMES` in `backend/ml/train_model.py` to:

```python
CLASS_NAMES = ["authentic", "ai_generated"]
```

Then train and test the binary model.

### Stage 2: Three-Class Model

After the binary model works, add:

```text
manipulated
```

Use datasets such as:

- CASIA image tampering dataset
- Columbia image splicing dataset
- NIST Nimble-style manipulation datasets
- Custom edited images made manually for testing

Final dataset format:

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

### Dataset Recommendation

Minimum useful dataset size:

```text
train: 500+ images per class
val:   100+ images per class
test:  100+ images per class
```

Better target:

```text
train: 2,000+ images per class
val:   300+ images per class
test:  300+ images per class
```

Avoid training and testing on the same images. Keep the `test` folder separate until final evaluation.

### Training Environment Recommendation

Use Google Colab or Kaggle GPU for training.

Reason:

- Local machine may be low on RAM.
- EasyOCR and PyTorch can be memory-heavy.
- GPU training is much faster.

Recommended command in Colab:

```python
!python train_model.py --data /content/dataset --epochs 10 --batch-size 16
```

If Colab runs out of memory:

```python
!python train_model.py --data /content/dataset --epochs 10 --batch-size 8
```

### How The Trained Model Connects To ScanAI

After training, save the model here:

```text
backend/ml/models/scanai_model.pt
```

Then restart the backend:

```powershell
cd D:\ScanAI\backend
.\venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8001
```

The backend will automatically:

- load the trained model,
- predict the image class,
- combine the model prediction with forensic heuristic checks,
- return the final verdict to the frontend.

### Recommendation For The Dataset You Found

The file:

```text
C:\Users\AYUSH\Downloads\detect-ai-vs-human-generated-images.zip
```

contains:

```text
train.csv
test.csv
```

It is useful only if you also have the actual image folders referenced by the CSV:

```text
train_data/
test_data_v2/
```

The CSV alone is not enough to train. It contains labels and file paths, but not the image files.

Recommended next action:

1. Download the full dataset including image folders.
2. Confirm what the labels mean:
   - `0 = authentic/human`
   - `1 = ai_generated`
3. Convert the dataset into folders:

```text
dataset/
  train/
    authentic/
    ai_generated/
  val/
    authentic/
    ai_generated/
  test/
    authentic/
    ai_generated/
```

4. Train the first binary model.
5. Add manipulated dataset later.

## Recommended Next Steps

Immediate next steps:

1. Download the full AI-vs-human dataset with images.
2. Build a dataset conversion script for that CSV dataset.
3. Train a binary EfficientNet-B0 model.
4. Place `scanai_model.pt` in `backend/ml/models`.
5. Test uploads in the browser.
6. Compare model output with current heuristic output.

After that:

1. Add manipulated image dataset.
2. Retrain as a 3-class model.
3. Add automated tests.
4. Set up MongoDB Atlas and file storage.
5. Deploy the project.

## Final Assessment

ScanAI is a working MVP and a strong foundation for a final project. The app demonstrates full-stack development, authentication, image upload processing, OCR, scan history, analytics, and an ML-ready backend.

The main limitation is that authenticity detection is currently heuristic-based until a trained model is added. The next major milestone is dataset preparation and model training.
