"""
Routes pour la gestion des exercices fiscaux
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List

import sys
sys.path.append('/app/backend')

from config import (
    fiscal_years_collection,
    activities_collection,
    companies_collection
)
from models import FiscalYearCreate
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/fiscal-years", tags=["Fiscal Years"])


@router.get("")
async def get_fiscal_years(current_user: dict = Depends(get_current_user)):
    """Get all fiscal years for the current user"""
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"]
    }).sort("start_date", -1))
    return [serialize_doc(fy) for fy in fiscal_years]


@router.get("/current")
async def get_current_fiscal_year(current_user: dict = Depends(get_current_user)):
    """Get the current (most recent draft) fiscal year"""
    fy = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "status": "draft"
    }, sort=[("start_date", -1)])
    
    if not fy:
        # Fallback to most recent
        fy = fiscal_years_collection.find_one({
            "tenant_id": current_user["id"]
        }, sort=[("start_date", -1)])
    
    if not fy:
        raise HTTPException(status_code=404, detail="No fiscal year found")
    
    return serialize_doc(fy)


@router.get("/{fiscal_year_id}")
async def get_fiscal_year(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific fiscal year"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    return serialize_doc(fy)


@router.post("")
async def create_fiscal_year(fy: FiscalYearCreate, current_user: dict = Depends(get_current_user)):
    """Create a new fiscal year"""
    # Get company_id
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    company_id = str(company["_id"]) if company else None
    
    fy_doc = {
        "name": fy.name,
        "start_date": fy.start_date,
        "end_date": fy.end_date,
        "status": "draft",
        "tenant_id": current_user["id"],
        "company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = fiscal_years_collection.insert_one(fy_doc)
    fy_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(fy_doc)


@router.post("/{fiscal_year_id}/close")
async def close_fiscal_year(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Close a fiscal year and calculate summary"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    if fy.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Fiscal year is already closed")
    
    # Calculate summary
    fy_start = fy.get("start_date", "")
    fy_end = fy.get("end_date", "")
    
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "date": {"$gte": fy_start, "$lte": fy_end}
    }))
    
    scope_emissions = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
    
    for activity in activities:
        scope = activity.get("scope", "scope1")
        emissions = activity.get("emissions", 0) or 0
        if scope in scope_emissions:
            scope_emissions[scope] += emissions
    
    total = sum(scope_emissions.values())
    
    summary = {
        "total_emissions": total,
        "total_emissions_tco2e": total / 1000,
        "scope_emissions": scope_emissions,
        "activities_count": len(activities),
        "closed_at": datetime.now(timezone.utc).isoformat()
    }
    
    fiscal_years_collection.update_one(
        {"_id": ObjectId(fiscal_year_id)},
        {
            "$set": {
                "status": "closed",
                "summary": summary,
                "closed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    updated = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    return serialize_doc(updated)


@router.post("/{fiscal_year_id}/rectify")
async def rectify_fiscal_year(
    fiscal_year_id: str, 
    reason: str = "Correction",
    current_user: dict = Depends(get_current_user)
):
    """Reopen a closed fiscal year for rectification"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    if fy.get("status") != "closed":
        raise HTTPException(status_code=400, detail="Only closed fiscal years can be rectified")
    
    fiscal_years_collection.update_one(
        {"_id": ObjectId(fiscal_year_id)},
        {
            "$set": {
                "status": "rectified",
                "rectified_at": datetime.now(timezone.utc).isoformat(),
                "rectification_reason": reason
            }
        }
    )
    
    updated = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    return serialize_doc(updated)


@router.post("/{fiscal_year_id}/duplicate")
async def duplicate_fiscal_year(
    fiscal_year_id: str,
    new_name: str,
    new_start_date: str,
    new_end_date: str,
    duplicate_activities: bool = False,
    activity_ids: List[str] = [],
    current_user: dict = Depends(get_current_user)
):
    """Duplicate a fiscal year, optionally with its activities"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Create new fiscal year
    new_fy = {
        "name": new_name,
        "start_date": new_start_date,
        "end_date": new_end_date,
        "status": "draft",
        "tenant_id": current_user["id"],
        "company_id": fy.get("company_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "duplicated_from": fiscal_year_id
    }
    
    result = fiscal_years_collection.insert_one(new_fy)
    new_fy_id = str(result.inserted_id)
    
    duplicated_activities = 0
    
    if duplicate_activities:
        # Get activities to duplicate
        fy_start = fy.get("start_date", "")
        fy_end = fy.get("end_date", "")
        
        query = {
            "tenant_id": current_user["id"],
            "date": {"$gte": fy_start, "$lte": fy_end}
        }
        
        if activity_ids:
            query["_id"] = {"$in": [ObjectId(aid) for aid in activity_ids]}
        
        activities = list(activities_collection.find(query))
        
        for activity in activities:
            # Calculate new date (shift to new fiscal year)
            old_date = activity.get("date", "")
            if old_date:
                # Simple date shift: same day/month in new year
                try:
                    old_dt = datetime.strptime(old_date, "%Y-%m-%d")
                    new_year = int(new_start_date[:4])
                    new_date = old_dt.replace(year=new_year).strftime("%Y-%m-%d")
                except:
                    new_date = new_start_date
            else:
                new_date = new_start_date
            
            new_activity = {
                k: v for k, v in activity.items() 
                if k not in ["_id", "created_at"]
            }
            new_activity["date"] = new_date
            new_activity["created_at"] = datetime.now(timezone.utc).isoformat()
            new_activity["duplicated_from"] = str(activity["_id"])
            
            activities_collection.insert_one(new_activity)
            duplicated_activities += 1
    
    return {
        "id": new_fy_id,
        "message": "Fiscal year duplicated successfully",
        "duplicated_activities": duplicated_activities
    }


@router.get("/{fiscal_year_id}/activities")
async def get_fiscal_year_activities(
    fiscal_year_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Get all activities for a fiscal year"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    fy_start = fy.get("start_date", "")
    fy_end = fy.get("end_date", "")
    
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "date": {"$gte": fy_start, "$lte": fy_end}
    }).sort("date", -1))
    
    return [serialize_doc(a) for a in activities]


@router.delete("/{fiscal_year_id}")
async def delete_fiscal_year(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a fiscal year (only if draft and no activities)"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    if fy.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft fiscal years can be deleted")
    
    # Check for activities
    fy_start = fy.get("start_date", "")
    fy_end = fy.get("end_date", "")
    
    activities_count = activities_collection.count_documents({
        "tenant_id": current_user["id"],
        "date": {"$gte": fy_start, "$lte": fy_end}
    })
    
    if activities_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete fiscal year with {activities_count} activities"
        )
    
    fiscal_years_collection.delete_one({"_id": ObjectId(fiscal_year_id)})
    
    return {"message": "Fiscal year deleted"}
