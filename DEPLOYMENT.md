# ScanAI Deployment Guide

This guide covers the production steps for ScanAI.

## Current Local Status

The local MVP is complete:

- React/Vite frontend
- FastAPI backend
- JWT authentication
- local JSON database for development
- OCR with EasyOCR
- image authenticity scanner with EfficientNet-B0 model support
- backend smoke test and API test suite

## Production Architecture

Recommended production setup:

```text
Frontend: Vercel
Backend: Render or Railway
Database: MongoDB Atlas
File storage: Cloudinary, Firebase Storage, or AWS S3
```

## 1. GitHub

1. Create a GitHub repository.
2. Push the project.
3. Do not commit local secrets or generated runtime files.

Important files/folders to keep out of Git:

```text
backend/.env
frontend/.env
backend/local_data/
backend/server*.log
backend/venv/
frontend/node_modules/
frontend/dist/
```

The trained model may be large. If GitHub rejects it, use Git LFS or upload it during backend deployment:

```text
backend/ml/models/scanai_model.pt
```

## 2. MongoDB Atlas

Create a MongoDB Atlas cluster and database.

Production backend env:

```env
DB_BACKEND=mongo
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
DB_NAME=scanai
```

Local JSON storage is for development only.

## 3. Backend Deployment

Recommended providers:

- Render
- Railway
- AWS Elastic Beanstalk / ECS

Backend root:

```text
backend
```

Install command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Required backend env vars:

```env
DB_BACKEND=mongo
MONGO_URI=your_mongodb_atlas_uri
DB_NAME=scanai
JWT_SECRET=use-a-long-random-production-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
MAX_UPLOAD_MB=10
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

Optional local-only env var:

```env
LOCAL_DB_PATH=local_data/scanai.json
```

## 4. Frontend Deployment

Recommended provider:

- Vercel

Frontend root:

```text
frontend
```

Install command:

```bash
npm install
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Frontend env:

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
```

## 5. CORS

After frontend deployment, update backend:

```env
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

For multiple origins:

```env
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000
```

## 6. File Storage

Current MVP stores scan metadata/results, not the original uploaded image files.

For production, add one storage provider:

- Cloudinary: easiest for image uploads
- Firebase Storage: good for app-style projects
- AWS S3: most production-grade

Recommended next implementation:

1. Upload original image to storage inside `/scan/upload`.
2. Store the returned file URL in the scan document.
3. Show file preview/download link in History.
4. Delete or lifecycle-manage old files if needed.

Suggested scan document fields:

```json
{
  "file_url": "https://...",
  "storage_provider": "cloudinary",
  "storage_public_id": "..."
}
```

## 7. Verification Before Deployment

Backend:

```powershell
cd D:\ScanAI\backend
.\venv\Scripts\python.exe scripts\smoke_test.py
.\venv\Scripts\python.exe scripts\api_test_suite.py
```

Frontend:

```powershell
cd D:\ScanAI\frontend
npm run build
```

Health check:

```text
https://your-backend-domain/health
```

Expected:

```json
{"status":"ok","database":"ok"}
```

## 8. Remaining External Inputs

To complete deployment, the user must provide:

- GitHub repository
- MongoDB Atlas URI
- backend hosting account
- frontend hosting account
- production frontend URL for CORS
- optional storage provider credentials

Without those external accounts/secrets, deployment cannot be completed locally.
