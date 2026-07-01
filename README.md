# ScanAI

ScanAI is an AI-powered multimodal dashboard for image authenticity verification and OCR text extraction.

Full project status, remaining work, and model-training recommendations are documented in `PROJECT_REPORT.md`.

Deployment steps are documented in `DEPLOYMENT.md`.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI, Python
- Image analysis: OpenCV, Pillow, NumPy
- OCR: EasyOCR
- Authentication: JWT with bcrypt password hashing
- Database: local JSON store for development, MongoDB option for production

## Current Features

- User signup, login, and token-based session restore
- Image upload workspace with authenticity and OCR modes
- Background scan processing
- Authenticity verdicts with trust score, risk profile, AI probability, and forensic checks
- OCR text extraction with confidence score
- Scan history, dashboard stats, analytics charts, and profile UI

## Local Development

### Backend

```powershell
cd D:\ScanAI\backend
copy .env.example .env
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

Health check:

```text
http://127.0.0.1:8001/health
```

Expected local response:

```json
{"status":"ok","database":"ok"}
```

### Frontend

```powershell
cd D:\ScanAI\frontend
copy .env.example .env
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

Development defaults use the local JSON database at `backend/local_data/scanai.json`.

For MongoDB, set this in `backend/.env`:

```env
DB_BACKEND=mongo
MONGO_URI=mongodb://localhost:27017
DB_NAME=scanai
```

For production, change:

- `JWT_SECRET`
- `CORS_ORIGINS`
- `DB_BACKEND`
- `MONGO_URI`
- frontend `VITE_API_BASE_URL`

## Verification

Run the backend smoke test:

```powershell
cd D:\ScanAI\backend
.\venv\Scripts\python.exe scripts\smoke_test.py
.\venv\Scripts\python.exe scripts\api_test_suite.py
```

Run frontend build:

```powershell
cd D:\ScanAI\frontend
npm run build
```

## Model Training

The current authenticity scanner uses forensic heuristics. For better accuracy, train the optional PyTorch model in `backend/ml`.

Dataset structure:

```text
backend/ml/dataset/
  train/
    authentic/
    ai_generated/
    manipulated/
  val/
    authentic/
    ai_generated/
    manipulated/
```

Train locally:

```powershell
cd D:\ScanAI\backend\ml
..\venv\Scripts\python.exe train_model.py --data dataset --epochs 10 --batch-size 8
```

Recommended: train on Google Colab, then place the saved model at:

```text
backend/ml/models/scanai_model.pt
```

After that, restart the backend. The API will automatically combine the trained model prediction with the existing forensic checks.

Full instructions are in `backend/ml/README.md`.

## Remaining Production Work

- Connect MongoDB Atlas or another managed MongoDB
- Add Cloudinary/Firebase/S3 storage for original files
- Improve authenticity detection with trained ML models
- Add automated test suite
- Deploy frontend to Vercel
- Deploy backend to Render, Railway, or AWS
