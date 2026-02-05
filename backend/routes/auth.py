"""
Routes d'authentification étendues
Inclut: login, register, password reset, email verification, account lockout
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from typing import Optional
import secrets
import hashlib

from config import users_collection, companies_collection, pwd_context, db
from models import UserRegister, UserLogin, UserResponse, UserUpdate
from services.auth import create_access_token, get_current_user, require_admin
from services.email import (
    send_password_reset_email, 
    send_email_verification,
    send_account_locked_email
)
from utils import serialize_doc

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Collections for tokens
password_reset_tokens = db["password_reset_tokens"]
email_verification_tokens = db["email_verification_tokens"]

# Constants
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
RESET_TOKEN_EXPIRY_HOURS = 1
VERIFICATION_TOKEN_EXPIRY_HOURS = 24


# ============== MODELS ==============

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class LoginExtended(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


# ============== HELPERS ==============

def generate_secure_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash a token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()

def check_account_locked(user: dict) -> tuple[bool, int]:
    """Check if account is locked and return remaining minutes"""
    locked_until = user.get("locked_until")
    if locked_until:
        locked_until_dt = datetime.fromisoformat(locked_until.replace('Z', '+00:00')) if isinstance(locked_until, str) else locked_until
        now = datetime.now(timezone.utc)
        if locked_until_dt > now:
            remaining = int((locked_until_dt - now).total_seconds() / 60) + 1
            return True, remaining
    return False, 0

def increment_failed_attempts(user_id: str, user_email: str, user_name: str, language: str):
    """Increment failed login attempts and lock if necessary"""
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    failed_attempts = user.get("failed_login_attempts", 0) + 1
    
    update_data = {"failed_login_attempts": failed_attempts}
    
    if failed_attempts >= MAX_LOGIN_ATTEMPTS:
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        update_data["locked_until"] = locked_until.isoformat()
        update_data["failed_login_attempts"] = 0  # Reset for next unlock
        
        # Send notification email
        send_account_locked_email(user_email, user_name, LOCKOUT_DURATION_MINUTES, language)
    
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return failed_attempts >= MAX_LOGIN_ATTEMPTS

def reset_failed_attempts(user_id: str):
    """Reset failed login attempts on successful login"""
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"failed_login_attempts": 0, "locked_until": None}}
    )


# ============== REGISTRATION ==============

@router.post("/register")
async def register(user: UserRegister):
    """Register a new user with email verification"""
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["password"] = pwd_context.hash(user_dict["password"])
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    user_dict["email_verified"] = False
    user_dict["failed_login_attempts"] = 0
    user_dict["locked_until"] = None
    
    result = users_collection.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Generate email verification token
    token = generate_secure_token()
    email_verification_tokens.insert_one({
        "user_id": user_id,
        "token_hash": hash_token(token),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_EXPIRY_HOURS)).isoformat()
    })
    
    # Send verification email
    send_email_verification(user.email, token, user.name, user.language)
    
    return {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "message": "User registered successfully. Please check your email to verify your account."
    }


# ============== LOGIN ==============

@router.post("/login")
async def login(user: LoginExtended):
    """Login with account lockout protection and remember me option"""
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(db_user["_id"])
    user_name = db_user.get("name", "User")
    language = db_user.get("language", "fr")
    
    # Check if account is locked
    is_locked, remaining_minutes = check_account_locked(db_user)
    if is_locked:
        raise HTTPException(
            status_code=423, 
            detail=f"Account locked. Try again in {remaining_minutes} minutes."
        )
    
    # Verify password
    if not pwd_context.verify(user.password, db_user["password"]):
        # Increment failed attempts
        was_locked = increment_failed_attempts(user_id, user.email, user_name, language)
        if was_locked:
            raise HTTPException(
                status_code=423,
                detail=f"Account locked due to too many failed attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes."
            )
        
        remaining_attempts = MAX_LOGIN_ATTEMPTS - db_user.get("failed_login_attempts", 0) - 1
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid credentials. {remaining_attempts} attempts remaining."
        )
    
    # Successful login - reset failed attempts
    reset_failed_attempts(user_id)
    
    # Create token with extended expiry if remember_me
    token_expiry = 43200 if user.remember_me else None  # 30 days vs default
    token = create_access_token({"sub": user_id}, expires_delta=token_expiry)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": db_user["email"],
            "name": db_user["name"],
            "language": db_user.get("language", "fr"),
            "role": db_user.get("role", "user"),
            "company_id": db_user.get("company_id"),
            "email_verified": db_user.get("email_verified", False)
        }
    }


# ============== PASSWORD RECOVERY ==============

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset email"""
    user = users_collection.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If this email exists, a reset link has been sent."}
    
    # Delete any existing tokens for this user
    password_reset_tokens.delete_many({"user_id": str(user["_id"])})
    
    # Generate new token
    token = generate_secure_token()
    password_reset_tokens.insert_one({
        "user_id": str(user["_id"]),
        "token_hash": hash_token(token),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)).isoformat()
    })
    
    # Send email
    send_password_reset_email(
        request.email, 
        token, 
        user.get("name", "User"),
        user.get("language", "fr")
    )
    
    return {"message": "If this email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    # Find token
    token_hash = hash_token(request.token)
    token_doc = password_reset_tokens.find_one({"token_hash": token_hash})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(token_doc["expires_at"].replace('Z', '+00:00'))
    if expires_at < datetime.now(timezone.utc):
        password_reset_tokens.delete_one({"_id": token_doc["_id"]})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_password_hash = pwd_context.hash(request.new_password)
    users_collection.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {
            "password": new_password_hash,
            "failed_login_attempts": 0,
            "locked_until": None
        }}
    )
    
    # Delete used token
    password_reset_tokens.delete_one({"_id": token_doc["_id"]})
    
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest, 
    current_user: dict = Depends(get_current_user)
):
    """Change password for authenticated user"""
    user = users_collection.find_one({"_id": ObjectId(current_user["id"])})
    
    if not pwd_context.verify(request.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_password_hash = pwd_context.hash(request.new_password)
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password": new_password_hash}}
    )
    
    return {"message": "Password changed successfully"}


# ============== EMAIL VERIFICATION ==============

@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify email using token"""
    token_hash = hash_token(request.token)
    token_doc = email_verification_tokens.find_one({"token_hash": token_hash})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(token_doc["expires_at"].replace('Z', '+00:00'))
    if expires_at < datetime.now(timezone.utc):
        email_verification_tokens.delete_one({"_id": token_doc["_id"]})
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Mark email as verified
    users_collection.update_one(
        {"_id": ObjectId(token_doc["user_id"])},
        {"$set": {"email_verified": True}}
    )
    
    # Delete used token
    email_verification_tokens.delete_one({"_id": token_doc["_id"]})
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification email"""
    user = users_collection.find_one({"email": request.email})
    
    if not user:
        return {"message": "If this email exists, a verification link has been sent."}
    
    if user.get("email_verified"):
        return {"message": "Email is already verified"}
    
    # Delete existing tokens
    email_verification_tokens.delete_many({"user_id": str(user["_id"])})
    
    # Generate new token
    token = generate_secure_token()
    email_verification_tokens.insert_one({
        "user_id": str(user["_id"]),
        "token_hash": hash_token(token),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_EXPIRY_HOURS)).isoformat()
    })
    
    # Send email
    send_email_verification(
        request.email, 
        token, 
        user.get("name", "User"),
        user.get("language", "fr")
    )
    
    return {"message": "If this email exists, a verification link has been sent."}


# ============== USER INFO ==============

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


# ============== ADMIN ROUTES ==============

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


@router.post("/users/{user_id}/unlock")
async def unlock_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Unlock a user account (admin only)"""
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"locked_until": None, "failed_login_attempts": 0}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User account unlocked successfully"}
