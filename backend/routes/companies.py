"""
Routes pour la gestion des entreprises
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import companies_collection, users_collection, fiscal_years_collection
from models import CompanyCreate, CompanyUpdate
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/company", tags=["Company"])


@router.post("")
async def create_company(company: CompanyCreate, current_user: dict = Depends(get_current_user)):
    """Create a new company for the current user"""
    # Check if user already has a company
    if current_user.get("company_id"):
        raise HTTPException(status_code=400, detail="User already has a company")
    
    company_doc = company.model_dump()
    company_doc["tenant_id"] = current_user["id"]
    company_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    result = companies_collection.insert_one(company_doc)
    company_id = str(result.inserted_id)
    
    # Update user with company_id
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"company_id": company_id}}
    )
    
    # Create default fiscal year
    current_year = datetime.now().year
    fiscal_year_start = company.fiscal_year_start_month
    
    if fiscal_year_start == 1:
        start_date = f"{current_year}-01-01"
        end_date = f"{current_year}-12-31"
    else:
        start_date = f"{current_year}-{fiscal_year_start:02d}-01"
        end_date = f"{current_year + 1}-{fiscal_year_start - 1:02d}-28"
    
    fiscal_year_doc = {
        "name": f"Exercice {current_year}",
        "start_date": start_date,
        "end_date": end_date,
        "status": "draft",
        "company_id": company_id,
        "tenant_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    fiscal_years_collection.insert_one(fiscal_year_doc)
    
    return {"id": company_id, "message": "Company created successfully"}


@router.get("")
async def get_company(current_user: dict = Depends(get_current_user)):
    """Get the current user's company"""
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not company:
        return None
    return serialize_doc(company)


@router.put("")
async def update_company(company: CompanyUpdate, current_user: dict = Depends(get_current_user)):
    """Update the current user's company"""
    update_data = {k: v for k, v in company.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = companies_collection.update_one(
        {"tenant_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    updated = companies_collection.find_one({"tenant_id": current_user["id"]})
    return serialize_doc(updated)


@router.delete("")
async def delete_company(current_user: dict = Depends(get_current_user)):
    """Delete the current user's company"""
    result = companies_collection.delete_one({"tenant_id": current_user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Remove company_id from user
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"company_id": None}}
    )
    
    return {"message": "Company deleted successfully"}
