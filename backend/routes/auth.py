"""
Routes d'authentification
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId

from config import users_collection, companies_collection, pwd_context
from models import UserRegister, UserLogin, UserResponse, UserUpdate
from services.auth import create_access_token, get_current_user, require_admin
from utils import serialize_doc

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(user: UserRegister):
    """Register a new user"""
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["password"] = pwd_context.hash(user_dict["password"])
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = users_collection.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "email": user.email,
        "name": user.name,
        "message": "User registered successfully"
    }


@router.post("/login")
async def login(user: UserLogin):
    """Login and get access token"""
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(db_user["_id"])})
    
    return {
        "token": token,
        "user": {
            "id": str(db_user["_id"]),
            "email": db_user["email"],
            "name": db_user["name"],
            "language": db_user.get("language", "fr"),
            "role": db_user.get("role", "user"),
            "company_id": db_user.get("company_id")
        }
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user


@router.put("/me")
async def update_me(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user info"""
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if update_data:
        users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )
    
    updated = users_collection.find_one({"_id": ObjectId(current_user["id"])})
    return serialize_doc(updated)


# Admin routes for user management
@router.get("/users")
async def list_users(current_user: dict = Depends(require_admin)):
    """List all users (admin only)"""
    users = list(users_collection.find({}, {"password": 0}))
    return [serialize_doc(u) for u in users]


@router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(require_admin)):
    """Update a user (admin only)"""
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if update_data:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    updated = users_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    
    return serialize_doc(updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}
