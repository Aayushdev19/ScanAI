from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, scan
from database import db
from config import settings

app = FastAPI(title="ScanAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(scan.router)

@app.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "database": "ok"}
    except Exception as exc:
        return {"status": "degraded", "database": "unreachable", "detail": str(exc)}
