import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image


TEST_DB_PATH = Path(__file__).resolve().parents[1] / "local_data" / "api_test_scanai.json"
os.environ["DB_BACKEND"] = "local"
os.environ["LOCAL_DB_PATH"] = str(TEST_DB_PATH)
os.environ.setdefault("JWT_SECRET", "api-test-secret")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn
from main import app


PORT = 8101
BASE = f"http://127.0.0.1:{PORT}"


def request(path, payload=None, token=None, headers=None, method=None, raw_body=None):
    body = raw_body
    req_headers = headers.copy() if headers else {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers=req_headers,
        method=method or ("GET" if body is None else "POST"),
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            text = res.read().decode("utf-8")
            return res.status, json.loads(text) if text else None
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        return exc.code, json.loads(text) if text else None


def multipart_upload(path, token, file_bytes, filename, content_type, fields=None):
    boundary = "----ScanAITestBoundary"
    parts = []
    for name, value in (fields or {}).items():
        parts.append(
            f"--{boundary}\r\n"
            f"Content-Disposition: form-data; name=\"{name}\"\r\n\r\n"
            f"{value}\r\n".encode("utf-8")
        )
    parts.append(
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {content_type}\r\n\r\n".encode("utf-8")
        + file_bytes
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    return request(
        path,
        token=token,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        raw_body=b"".join(parts),
    )


def make_image_bytes():
    image = Image.new("RGB", (96, 96), "white")
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def assert_status(actual, expected, context):
    assert actual == expected, f"{context}: expected HTTP {expected}, got {actual}"


def main():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    time.sleep(1.5)

    try:
        email = f"api-test-{int(time.time())}@example.com"
        password = "password123"

        status, health = request("/health")
        assert_status(status, 200, "health")
        assert health["status"] == "ok", health

        status, register = request(
            "/auth/register",
            {"name": "API Test", "email": email, "password": password},
        )
        assert_status(status, 201, "register")
        token = register["access_token"]

        status, duplicate = request(
            "/auth/register",
            {"name": "API Test", "email": email, "password": password},
        )
        assert_status(status, 400, "duplicate register")
        assert duplicate["detail"] == "Email already registered", duplicate

        status, bad_login = request("/auth/login", {"email": email, "password": "wrong-pass"})
        assert_status(status, 401, "bad login")

        status, login = request("/auth/login", {"email": email, "password": password})
        assert_status(status, 200, "login")
        token = login["access_token"]

        status, me = request("/auth/me", token=token)
        assert_status(status, 200, "me")
        assert me["email"] == email, me

        status, no_token = request("/scan/history")
        assert_status(status, 401, "history without token")

        status, invalid_upload = multipart_upload(
            "/scan/upload",
            token,
            b"not an image",
            "bad.txt",
            "text/plain",
            {"mode": "authenticity"},
        )
        assert_status(status, 400, "invalid upload")

        status, upload = multipart_upload(
            "/scan/upload",
            token,
            make_image_bytes(),
            "test.jpg",
            "image/jpeg",
            {"mode": "authenticity"},
        )
        assert_status(status, 200, "valid upload")
        scan_id = upload["scan_id"]

        result = None
        for _ in range(180):
            time.sleep(0.5)
            status, result = request(f"/scan/result/{scan_id}", token=token)
            assert_status(status, 200, "scan result")
            if result["status"] in {"completed", "failed"}:
                break
        assert result and result["status"] == "completed", result
        assert result["verdict"] in {"AUTHENTIC", "AI GENERATED", "MANIPULATED", "REVIEW NEEDED"}, result

        status, history = request("/scan/history", token=token)
        assert_status(status, 200, "history")
        assert len(history) >= 1, history

        print("API test suite passed: auth, upload validation, scan processing, result, and history.")
    finally:
        server.should_exit = True
        thread.join(timeout=5)
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()


if __name__ == "__main__":
    main()
