"""
Routes d'administration (facteurs d'émission, sous-catégories, conversions)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List
import json

import sys
sys.path.append('/app/backend')

from config import (
    emission_factors_collection,
    subcategories_collection,
    unit_conversions_collection,
    users_collection
)
from models import (
    EmissionFactorV2Create,
    EmissionFactorV2Update,
    EmissionFactorNewVersion,
    SubcategoryCreate,
    SubcategoryUpdate,
    UnitConversionCreate,
    UnitConversionUpdate,
    UserUpdate
)
from services.auth import get_current_user, require_admin
from utils import serialize_doc

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==================== USER MANAGEMENT ====================

from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str = ""
    role: str = "user"

class RoleUpdate(BaseModel):
    role: str


@router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new user (admin only)"""
    from services.auth import get_password_hash
    
    # Check if email already exists
    existing = users_collection.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Un utilisateur avec cet email existe déjà")
    
    # Validate role
    if user_data.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Rôle invalide. Utilisez 'user' ou 'admin'")
    
    # Validate password
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Create user document
    user_doc = {
        "email": user_data.email.lower(),
        "password": get_password_hash(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "email_verified": True,  # Admin-created users are auto-verified
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    result = users_collection.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    
    # Remove password from response
    del user_doc["password"]
    
    return serialize_doc(user_doc)


@router.get("/users")
async def list_users(current_user: dict = Depends(require_admin)):
    """List all users (admin only)"""
    users = list(users_collection.find({}, {"password": 0}))
    return [serialize_doc(u) for u in users]

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a user's role (admin only)"""
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {role_update.role}"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a user (admin only)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = users_collection.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


# ==================== EMISSION FACTORS V2 ====================

@router.get("/emission-factors-v2")
async def get_emission_factors_v2(current_user: dict = Depends(require_admin)):
    """Get all emission factors v2 (admin only)"""
    factors = list(emission_factors_collection.find({"deleted_at": None}))
    return [serialize_doc(f) for f in factors]


@router.post("/emission-factors-v2")
async def create_emission_factor_v2(
    factor: EmissionFactorV2Create,
    current_user: dict = Depends(require_admin)
):
    """Create a new emission factor v2"""
    factor_doc = factor.model_dump()
    factor_doc["version"] = 1
    factor_doc["valid_from_year"] = factor.year
    factor_doc["valid_to_year"] = None
    factor_doc["is_correction"] = False
    factor_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    factor_doc["created_by"] = current_user["id"]
    factor_doc["deleted_at"] = None
    
    # Convert impacts to dict format
    factor_doc["impacts"] = [i.model_dump() for i in factor.impacts]
    
    result = emission_factors_collection.insert_one(factor_doc)
    factor_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(factor_doc)


@router.put("/emission-factors-v2/{factor_id}")
async def update_emission_factor_v2(
    factor_id: str,
    factor: EmissionFactorV2Update,
    current_user: dict = Depends(require_admin)
):
    """Update an emission factor v2"""
    update_data = {k: v for k, v in factor.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if "impacts" in update_data:
        update_data["impacts"] = [i.model_dump() if hasattr(i, 'model_dump') else i for i in update_data["impacts"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = emission_factors_collection.update_one(
        {"_id": ObjectId(factor_id), "deleted_at": None},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    
    updated = emission_factors_collection.find_one({"_id": ObjectId(factor_id)})
    return serialize_doc(updated)


@router.post("/emission-factors-v2/{factor_id}/new-version")
async def create_new_version(
    factor_id: str,
    version_data: EmissionFactorNewVersion,
    current_user: dict = Depends(require_admin)
):
    """Create a new version of an emission factor"""
    # Get current factor
    current = emission_factors_collection.find_one({
        "_id": ObjectId(factor_id),
        "deleted_at": None
    })
    
    if not current:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    
    current_version = current.get("version", 1)
    new_version = current_version + 1
    
    # Determine valid_from_year
    valid_from_year = version_data.valid_from_year or (datetime.now().year + 1)
    
    # Close current version
    emission_factors_collection.update_one(
        {"_id": ObjectId(factor_id)},
        {"$set": {"valid_to_year": valid_from_year - 1}}
    )
    
    # Create new version document
    new_doc = {k: v for k, v in current.items() if k != "_id"}
    new_doc["version"] = new_version
    new_doc["valid_from_year"] = valid_from_year
    new_doc["valid_to_year"] = None
    new_doc["is_correction"] = version_data.is_correction
    new_doc["change_reason"] = version_data.change_reason
    new_doc["previous_version_id"] = factor_id
    new_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    new_doc["created_by"] = current_user["id"]
    
    # Apply updates from version_data
    new_doc["impacts"] = [i.model_dump() for i in version_data.impacts]
    
    if version_data.name_fr:
        new_doc["name_fr"] = version_data.name_fr
    if version_data.name_de:
        new_doc["name_de"] = version_data.name_de
    if version_data.source:
        new_doc["source"] = version_data.source
    if version_data.year:
        new_doc["year"] = version_data.year
    
    result = emission_factors_collection.insert_one(new_doc)
    
    # Update original to point to new version
    emission_factors_collection.update_one(
        {"_id": ObjectId(factor_id)},
        {"$set": {"replaced_by": str(result.inserted_id)}}
    )
    
    new_doc["id"] = str(result.inserted_id)
    return serialize_doc(new_doc)


@router.get("/emission-factors-v2/{factor_id}/history")
async def get_factor_history(
    factor_id: str,
    current_user: dict = Depends(require_admin)
):
    """Get version history of an emission factor"""
    # Get current factor
    current = emission_factors_collection.find_one({"_id": ObjectId(factor_id)})
    
    if not current:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    
    history = [serialize_doc(current)]
    
    # Follow previous_version_id chain
    prev_id = current.get("previous_version_id")
    while prev_id:
        prev = emission_factors_collection.find_one({"_id": ObjectId(prev_id)})
        if prev:
            history.append(serialize_doc(prev))
            prev_id = prev.get("previous_version_id")
        else:
            break
    
    # Follow replaced_by chain
    next_id = current.get("replaced_by")
    while next_id:
        next_factor = emission_factors_collection.find_one({"_id": ObjectId(next_id)})
        if next_factor:
            history.insert(0, serialize_doc(next_factor))
            next_id = next_factor.get("replaced_by")
        else:
            break
    
    return history


@router.delete("/emission-factors-v2/{factor_id}/soft")
async def soft_delete_factor(
    factor_id: str,
    current_user: dict = Depends(require_admin)
):
    """Soft delete an emission factor (archive)"""
    result = emission_factors_collection.update_one(
        {"_id": ObjectId(factor_id)},
        {
            "$set": {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "deleted_by": current_user["id"]
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    
    return {"message": "Emission factor archived"}


# ==================== SUBCATEGORIES ====================

@router.get("/subcategories")
async def get_subcategories_admin(current_user: dict = Depends(require_admin)):
    """Get all subcategories (admin)"""
    subcategories = list(subcategories_collection.find({}).sort("order", 1))
    return [serialize_doc(s) for s in subcategories]


@router.post("/subcategories")
async def create_subcategory(
    subcategory: SubcategoryCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new subcategory"""
    subcat_doc = subcategory.model_dump()
    subcat_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = subcategories_collection.insert_one(subcat_doc)
    subcat_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(subcat_doc)


@router.put("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: str,
    subcategory: SubcategoryUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a subcategory"""
    update_data = {k: v for k, v in subcategory.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = subcategories_collection.update_one(
        {"_id": ObjectId(subcategory_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    updated = subcategories_collection.find_one({"_id": ObjectId(subcategory_id)})
    return serialize_doc(updated)


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(
    subcategory_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a subcategory"""
    result = subcategories_collection.delete_one({"_id": ObjectId(subcategory_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    return {"message": "Subcategory deleted"}


# ==================== UNIT CONVERSIONS ====================

@router.get("/unit-conversions")
async def get_unit_conversions_admin(current_user: dict = Depends(require_admin)):
    """Get all unit conversions (admin)"""
    conversions = list(unit_conversions_collection.find({}))
    return [serialize_doc(c) for c in conversions]


@router.post("/unit-conversions")
async def create_unit_conversion(
    conversion: UnitConversionCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new unit conversion"""
    conv_doc = conversion.model_dump()
    conv_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = unit_conversions_collection.insert_one(conv_doc)
    conv_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(conv_doc)


@router.put("/unit-conversions/{conversion_id}")
async def update_unit_conversion(
    conversion_id: str,
    conversion: UnitConversionUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a unit conversion"""
    update_data = {k: v for k, v in conversion.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = unit_conversions_collection.update_one(
        {"_id": ObjectId(conversion_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unit conversion not found")
    
    updated = unit_conversions_collection.find_one({"_id": ObjectId(conversion_id)})
    return serialize_doc(updated)


@router.delete("/unit-conversions/{conversion_id}")
async def delete_unit_conversion(
    conversion_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a unit conversion"""
    result = unit_conversions_collection.delete_one({"_id": ObjectId(conversion_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit conversion not found")
    
    return {"message": "Unit conversion deleted"}
