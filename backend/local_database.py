import copy
import json
from datetime import datetime
from pathlib import Path
from threading import RLock

from bson import ObjectId


class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, modified_count: int):
        self.modified_count = modified_count


def _encode(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return {"__datetime__": value.isoformat()}
    if isinstance(value, dict):
        return {key: _encode(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_encode(item) for item in value]
    return value


def _decode(value):
    if isinstance(value, dict):
        if "__datetime__" in value:
            return datetime.fromisoformat(value["__datetime__"])
        return {key: _decode(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_decode(item) for item in value]
    return value


def _matches(doc: dict, query: dict) -> bool:
    for key, expected in query.items():
        if str(doc.get(key)) != str(expected):
            return False
    return True


class LocalCursor:
    def __init__(self, docs):
        self.docs = list(docs)
        self.index = 0

    def sort(self, field: str, direction: int):
        reverse = direction < 0
        self.docs.sort(key=lambda doc: doc.get(field) or datetime.min, reverse=reverse)
        return self

    def limit(self, count: int):
        self.docs = self.docs[:count]
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.docs):
            raise StopAsyncIteration
        doc = self.docs[self.index]
        self.index += 1
        return copy.deepcopy(doc)


class LocalCollection:
    def __init__(self, db, name: str):
        self.db = db
        self.name = name

    async def find_one(self, query: dict):
        with self.db.lock:
            for doc in self.db.data[self.name]:
                if _matches(doc, query):
                    return copy.deepcopy(doc)
        return None

    async def insert_one(self, doc: dict):
        inserted_id = ObjectId()
        new_doc = copy.deepcopy(doc)
        new_doc["_id"] = inserted_id
        with self.db.lock:
            self.db.data[self.name].append(new_doc)
            self.db.save()
        return InsertOneResult(inserted_id)

    async def update_one(self, query: dict, update: dict):
        modified = 0
        with self.db.lock:
            for doc in self.db.data[self.name]:
                if _matches(doc, query):
                    doc.update(update.get("$set", {}))
                    modified = 1
                    break
            if modified:
                self.db.save()
        return UpdateResult(modified)

    def find(self, query: dict):
        with self.db.lock:
            docs = [copy.deepcopy(doc) for doc in self.db.data[self.name] if _matches(doc, query)]
        return LocalCursor(docs)


class LocalDatabase:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.lock = RLock()
        self.data = {"users": [], "scans": []}
        self.load()

    def load(self):
        if not self.path.exists():
            self.save()
            return
        with self.path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        self.data = _decode(raw)
        self.data.setdefault("users", [])
        self.data.setdefault("scans", [])

    def save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(_encode(self.data), f, indent=2)

    def __getitem__(self, name: str):
        self.data.setdefault(name, [])
        return LocalCollection(self, name)

    async def command(self, command_name: str):
        if command_name != "ping":
            raise ValueError(f"Unsupported local database command: {command_name}")
        return {"ok": 1, "backend": "local"}
