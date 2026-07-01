import asyncio
import traceback

async def main():
    log = open("diag.txt", "w")

    # Test /auth/me flow
    try:
        from services.auth_service import create_token, get_current_user
        token = create_token("test_user_id")
        log.write(f"Token created: {token[:30]}...\n")
    except Exception:
        log.write("Token ERROR:\n")
        traceback.print_exc(file=log)

    # Test history query
    try:
        from database import scans_col
        docs = []
        async for doc in scans_col.find({"user_id": "test"}).limit(5):
            doc["id"] = str(doc.pop("_id"))
            docs.append(doc)
        log.write(f"History query OK: {len(docs)} docs\n")
    except Exception:
        log.write("History ERROR:\n")
        traceback.print_exc(file=log)

    # Test config
    try:
        from config import settings
        log.write(f"Config OK: DB={settings.DB_NAME}\n")
    except Exception:
        log.write("Config ERROR:\n")
        traceback.print_exc(file=log)

    log.flush()
    log.close()
    print("Done")

asyncio.run(main())
