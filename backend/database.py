import asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from local_database import LocalDatabase


def _build_database():
    if settings.DB_BACKEND.lower() != "mongo":
        return None, LocalDatabase(settings.LOCAL_DB_PATH)

    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        asyncio.run(client.admin.command("ping"))
        return client, client[settings.DB_NAME]
    except Exception:
        return None, LocalDatabase(settings.LOCAL_DB_PATH)


client, db = _build_database()
users_col = db["users"]
scans_col = db["scans"]
