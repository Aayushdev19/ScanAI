from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
import asyncio
from database import scans_col
from config import settings
from services.auth_service import get_current_user


def analyze_image(b):
    from services.vision_service import analyze_image as _f
    return _f(b)

def extract_text(b):
    from services.ocr_service import extract_text as _f
    return _f(b)

router = APIRouter(prefix="/scan", tags=["scan"])

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}

async def _process(scan_id: str, img_bytes: bytes, mode: str):
    try:
        if mode == "authenticity":
            result = await asyncio.to_thread(analyze_image, img_bytes)
        else:
            result = await asyncio.to_thread(extract_text, img_bytes)
        await scans_col.update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {**result, "status": "completed"}},
        )
    except Exception as e:
        await scans_col.update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"status": "failed", "error": str(e)}},
        )

@router.post("/upload")
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form("authenticity"),
    user_id: str = Depends(get_current_user),
):
    import os, traceback
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    try:
        img_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    if not img_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    size_mb = f"{len(img_bytes) / 1024 / 1024:.2f} MB"

    doc = {
        "user_id": user_id,
        "filename": file.filename,
        "file_size": size_mb,
        "mode": mode,
        "status": "processing",
        "created_at": datetime.utcnow(),
    }
    result = await scans_col.insert_one(doc)
    scan_id = str(result.inserted_id)

    background_tasks.add_task(_process, scan_id, img_bytes, mode)
    return {"scan_id": scan_id, "status": "processing"}

@router.get("/result/{scan_id}")
async def get_result(scan_id: str, user_id: str = Depends(get_current_user)):
    try:
        object_id = ObjectId(scan_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid scan id")

    doc = await scans_col.find_one({"_id": object_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Scan not found")
    doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/history")
async def history(user_id: str = Depends(get_current_user)):
    cursor = scans_col.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    docs = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        docs.append(doc)
    return docs
