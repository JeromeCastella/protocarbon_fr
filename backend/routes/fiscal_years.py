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
from models import FiscalYearCreate, FiscalYearDuplicate, FiscalYearContextUpdate
from services.auth import get_current_user
from utils import serialize_doc
from routes.dashboard import normalize_scope_for_reporting

router = APIRouter(prefix="/fiscal-years", tags=["Fiscal Years"])


@router.get("")
async def get_fiscal_years(current_user: dict = Depends(get_current_user)):
    """Get all fiscal years for the current user with activity counts"""
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"]
    }).sort("start_date", -1))
    
    # Add activity count for each fiscal year
    result = []
    for fy in fiscal_years:
        fy_data = serialize_doc(fy)
        fy_id = str(fy["_id"])
        
        # Count activities for this fiscal year
        activities_count = activities_collection.count_documents({
            "tenant_id": current_user["id"],
            "fiscal_year_id": fy_id
        })
        fy_data["activities_count"] = activities_count
        
        result.append(fy_data)
    
    return result


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


@router.put("/{fiscal_year_id}/context")
async def update_fiscal_year_context(
    fiscal_year_id: str,
    context_update: FiscalYearContextUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the context (employees, revenue, surface_area, excluded_categories) of a fiscal year.
    These values are specific to each fiscal year and affect KPIs calculation.
    """
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Check if fiscal year is closed
    if fy.get("status") == "closed":
        raise HTTPException(
            status_code=400, 
            detail="Cannot modify context of a closed fiscal year"
        )
    
    # Get existing context or initialize empty
    existing_context = fy.get("context", {})
    
    # Update only the fields that were provided
    update_data = {}
    if context_update.employees is not None:
        update_data["context.employees"] = context_update.employees
    if context_update.revenue is not None:
        update_data["context.revenue"] = context_update.revenue
    if context_update.surface_area is not None:
        update_data["context.surface_area"] = context_update.surface_area
    if context_update.excluded_categories is not None:
        update_data["context.excluded_categories"] = context_update.excluded_categories
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        fiscal_years_collection.update_one(
            {"_id": ObjectId(fiscal_year_id)},
            {"$set": update_data}
        )
    
    updated_fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    return serialize_doc(updated_fy)


@router.get("/{fiscal_year_id}/context")
async def get_fiscal_year_context(
    fiscal_year_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the context of a fiscal year with fallback to company values.
    Returns employees, revenue, surface_area, excluded_categories.
    """
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Get company for fallback values
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    # Get context from fiscal year with fallback to company
    fy_context = fy.get("context", {})
    
    context = {
        "employees": fy_context.get("employees") if fy_context.get("employees") is not None else (company.get("employees") if company else None),
        "revenue": fy_context.get("revenue") if fy_context.get("revenue") is not None else (company.get("revenue") if company else None),
        "surface_area": fy_context.get("surface_area") if fy_context.get("surface_area") is not None else (company.get("surface_area") if company else None),
        "excluded_categories": fy_context.get("excluded_categories") if fy_context.get("excluded_categories") is not None else (company.get("excluded_categories", []) if company else [])
    }
    
    return {
        "fiscal_year_id": fiscal_year_id,
        "fiscal_year_name": fy.get("name"),
        "fiscal_year_status": fy.get("status"),
        "context": context,
        "has_own_context": bool(fy_context),
        "is_readonly": fy.get("status") == "closed"
    }


@router.post("")
async def create_fiscal_year(fy: FiscalYearCreate, current_user: dict = Depends(get_current_user)):
    """Create a new fiscal year (one per calendar year)"""
    # Get company_id
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    company_id = str(company["_id"]) if company else None
    
    # Check if fiscal year already exists for this year
    existing = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "year": fy.year
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Un exercice fiscal existe déjà pour l'année {fy.year}"
        )
    
    # Auto-generate dates (calendar year)
    start_date = f"{fy.year}-01-01"
    end_date = f"{fy.year}-12-31"
    name = f"Exercice {fy.year}"
    
    # Initialize context from previous fiscal year or company
    context = {}
    
    # Try to get context from previous fiscal year (year - 1)
    previous_fy = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "year": fy.year - 1
    })
    
    if previous_fy and previous_fy.get("context"):
        # Copy context from previous year
        prev_context = previous_fy["context"]
        context = {
            "employees": prev_context.get("employees"),
            "revenue": prev_context.get("revenue"),
            "surface_area": prev_context.get("surface_area"),
            "excluded_categories": prev_context.get("excluded_categories", [])
        }
    elif company:
        # Fallback to company values (first fiscal year)
        context = {
            "employees": company.get("employees"),
            "revenue": company.get("revenue"),
            "surface_area": company.get("surface_area"),
            "excluded_categories": company.get("excluded_categories", [])
        }
    
    fy_doc = {
        "name": name,
        "year": fy.year,
        "start_date": start_date,
        "end_date": end_date,
        "status": "draft",
        "tenant_id": current_user["id"],
        "company_id": company_id,
        "context": context,
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
    data: FiscalYearDuplicate,
    current_user: dict = Depends(get_current_user)
):
    """Duplicate a fiscal year to a new year, optionally with its activities"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Check if target year already exists
    existing = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "year": data.new_year
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Un exercice fiscal existe déjà pour l'année {data.new_year}"
        )
    
    # Auto-generate dates for new year
    new_start_date = f"{data.new_year}-01-01"
    new_end_date = f"{data.new_year}-12-31"
    new_name = f"Exercice {data.new_year}"
    
    # Copy context from source fiscal year
    source_context = fy.get("context", {})
    new_context = {
        "employees": source_context.get("employees"),
        "revenue": source_context.get("revenue"),
        "surface_area": source_context.get("surface_area"),
        "excluded_categories": source_context.get("excluded_categories", [])
    }
    
    # If source has no context, try company fallback
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    if not source_context and company:
        new_context = {
            "employees": company.get("employees"),
            "revenue": company.get("revenue"),
            "surface_area": company.get("surface_area"),
            "excluded_categories": company.get("excluded_categories", [])
        }
    
    # Create new fiscal year
    new_fy = {
        "name": new_name,
        "year": data.new_year,
        "start_date": new_start_date,
        "end_date": new_end_date,
        "status": "draft",
        "tenant_id": current_user["id"],
        "company_id": fy.get("company_id"),
        "context": new_context,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "duplicated_from": fiscal_year_id
    }
    
    result = fiscal_years_collection.insert_one(new_fy)
    new_fy_id = str(result.inserted_id)
    
    duplicated_activities = 0
    
    if data.duplicate_activities:
        # Get activities to duplicate (by fiscal_year_id)
        source_fy_id = str(fy["_id"])
        
        query = {
            "tenant_id": current_user["id"],
            "fiscal_year_id": source_fy_id
        }
        
        if data.activity_ids_to_duplicate:
            query["_id"] = {"$in": [ObjectId(aid) for aid in data.activity_ids_to_duplicate]}
        
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
            new_activity["fiscal_year_id"] = new_fy_id  # Associate with new fiscal year
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
    """
    Delete a fiscal year and all associated activities.
    This is a destructive operation - all data will be permanently deleted.
    """
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id),
        "tenant_id": current_user["id"]
    })
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Count activities to be deleted (for logging/audit)
    activities_count = activities_collection.count_documents({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fiscal_year_id
    })
    
    # Delete all activities associated with this fiscal year
    if activities_count > 0:
        delete_result = activities_collection.delete_many({
            "tenant_id": current_user["id"],
            "fiscal_year_id": fiscal_year_id
        })
        deleted_activities = delete_result.deleted_count
    else:
        deleted_activities = 0
    
    # Delete the fiscal year itself
    fiscal_years_collection.delete_one({"_id": ObjectId(fiscal_year_id)})
    
    return {
        "message": "Fiscal year deleted",
        "deleted_activities": deleted_activities
    }


@router.post("/migrate-context")
async def migrate_fiscal_years_context(current_user: dict = Depends(get_current_user)):
    """
    Migration endpoint: Initialize context on existing fiscal years that don't have one.
    Copies values from company document.
    """
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get context from company
    company_context = {
        "employees": company.get("employees"),
        "revenue": company.get("revenue"),
        "surface_area": company.get("surface_area"),
        "excluded_categories": company.get("excluded_categories", [])
    }
    
    # Find fiscal years without context
    fiscal_years_without_context = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"],
        "$or": [
            {"context": {"$exists": False}},
            {"context": None},
            {"context": {}}
        ]
    }))
    
    migrated_count = 0
    for fy in fiscal_years_without_context:
        fiscal_years_collection.update_one(
            {"_id": fy["_id"]},
            {"$set": {
                "context": company_context,
                "context_migrated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        migrated_count += 1
    
    return {
        "message": "Migration completed",
        "migrated_fiscal_years": migrated_count,
        "company_context_used": company_context
    }
