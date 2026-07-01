from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from pymongo.errors import PyMongoError
from database import users_col
from models.user import UserRegister, UserLogin, UserOut
from services.auth_service import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _database_error():
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Database is unavailable. Check backend database configuration.",
    )

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister):
    try:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        if await users_col.find_one({"email": body.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        doc = {
            "name": name,
            "email": body.email,
            "password": hash_password(body.password),
            "role": "user",
        }
        result = await users_col.insert_one(doc)
        token = create_token(str(result.inserted_id))
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except PyMongoError:
        _database_error()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed") from e

@router.post("/login")
async def login(body: UserLogin):
    try:
        user = await users_col.find_one({"email": body.email})
        if not user or not verify_password(body.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token(str(user["_id"]))
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "role": user["role"]},
        }
    except HTTPException:
        raise
    except PyMongoError:
        _database_error()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed") from e

@router.get("/me", response_model=UserOut)
async def me(user_id: str = Depends(get_current_user)):
    try:
        user = await users_col.find_one({"_id": ObjectId(user_id)})
    except PyMongoError:
        _database_error()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user id") from e
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"], role=user["role"])
