import json
import os
import sys
import threading
import time
import urllib.request
from pathlib import Path

TEST_DB_PATH = Path(__file__).resolve().parents[1] / "local_data" / "smoke_test_scanai.json"
os.environ["DB_BACKEND"] = "local"
os.environ["LOCAL_DB_PATH"] = str(TEST_DB_PATH)
os.environ.setdefault("JWT_SECRET", "smoke-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from main import app


PORT = 8099


def request(path, payload=None, token=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"http://127.0.0.1:{PORT}{path}",
        data=data,
        headers=headers,
        method="GET" if payload is None else "POST",
    )
    with urllib.request.urlopen(req, timeout=15) as res:
        return res.status, json.loads(res.read().decode("utf-8"))


def main():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    time.sleep(1.5)

    email = f"smoke{int(time.time())}@example.com"
    password = "password123"

    health_status, health = request("/health")
    assert health_status == 200, health
    assert health["status"] == "ok", health

    register_status, register = request(
        "/auth/register",
        {"name": "Smoke Test", "email": email, "password": password},
    )
    assert register_status == 201, register
    assert "access_token" in register, register

    login_status, login = request("/auth/login", {"email": email, "password": password})
    assert login_status == 200, login
    assert "access_token" in login, login

    me_status, me = request("/auth/me", token=login["access_token"])
    assert me_status == 200, me
    assert me["email"] == email, me

    server.should_exit = True
    thread.join(timeout=5)
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    print("Smoke test passed: health, register, login, and /auth/me are working.")


if __name__ == "__main__":
    main()
