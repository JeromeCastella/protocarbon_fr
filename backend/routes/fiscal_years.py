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
    companies_collection,
    scenarios_collection
)
from models import FiscalYearCreate, FiscalYearDuplicate, FiscalYearContextUpdate
from services.auth import get_current_user
from utils import serialize_doc
from services.scope_mapping import normalize_scope_for_reporting

router = APIRouter(prefix="/fiscal-years", tags=["Fiscal Years"])


# ==================== HELPERS ====================

def _copy_context_fields(source: dict) -> dict:
    """Copy context-related fields from a dictionary."""
    return {
        "employees": source.get("employees"),
        "revenue": source.get("revenue"),
        "surface_area": source.get("surface_area"),
        "excluded_categories": source.get("excluded_categories", []),
    }


def _resolve_context_from_source_or_company(source_context: dict, tenant_id: str) -> dict:
    """Build FY context from a source context dict, falling back to company info."""
    if source_context:
        return _copy_context_fields(source_context)
    company = companies_collection.find_one({"tenant_id": tenant_id})
    return _copy_context_fields(company) if company else {}


def _initialize_fy_context(tenant_id: str, year: int) -> dict:
    """Initialize context for a new FY from previous year or company fallback."""
    previous_fy = fiscal_years_collection.find_one({"tenant_id": tenant_id, "year": year - 1})
    if previous_fy and previous_fy.get("context"):
        return _copy_context_fields(previous_fy["context"])
    company = companies_collection.find_one({"tenant_id": tenant_id})
    return _copy_context_fields(company) if company else {}


def _resolve_scenario_info(data: FiscalYearDuplicate):
    """Validate and resolve scenario name and ID from request data."""
    if not data.is_scenario:
        return None, None
    if data.scenario_id:
        scenario_doc = scenarios_collection.find_one({"_id": ObjectId(data.scenario_id)})
        if not scenario_doc:
            raise HTTPException(status_code=404, detail="Scenario introuvable")
        return scenario_doc["name"], data.scenario_id
    if data.scenario_name:
        return data.scenario_name, None
    raise HTTPException(status_code=400, detail="Un scenario (scenario_id ou scenario_name) est requis")


def _validate_duplicate_target(data: FiscalYearDuplicate, tenant_id: str, scenario_id: str = None):
    """Check that the target year/scenario doesn't already have a fiscal year."""
    if not data.is_scenario:
        existing = fiscal_years_collection.find_one({
            "tenant_id": tenant_id, "year": data.new_year, "type": {"$ne": "scenario"}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Un exercice fiscal existe deja pour l'annee {data.new_year}")
    elif scenario_id:
        existing = fiscal_years_collection.find_one({
            "scenario_id": scenario_id, "year": data.new_year, "type": "scenario"
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Ce scenario a deja un exercice pour l'annee {data.new_year}")


def _duplicate_activities(source_fy_id: str, new_fy_id: str, new_start_date: str,
                          tenant_id: str, activity_ids: list = None) -> int:
    """Duplicate activities from source to new fiscal year. Returns count."""
    query = {"tenant_id": tenant_id, "fiscal_year_id": source_fy_id}
    if activity_ids:
        query["_id"] = {"$in": [ObjectId(aid) for aid in activity_ids]}

    activities = list(activities_collection.find(query))
    new_year = int(new_start_date[:4])
    count = 0

    for activity in activities:
        old_date = activity.get("date", "")
        try:
            new_date = datetime.strptime(old_date, "%Y-%m-%d").replace(year=new_year).strftime("%Y-%m-%d") if old_date else new_start_date
        except (ValueError, TypeError):
            new_date = new_start_date

        new_activity = {k: v for k, v in activity.items() if k not in ["_id", "created_at"]}
        new_activity.update({
            "date": new_date,
            "fiscal_year_id": new_fy_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "duplicated_from": str(activity["_id"]),
        })
        activities_collection.insert_one(new_activity)
        count += 1
    return count


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
    """Get the current (most recent draft) fiscal year - excludes scenarios"""
    fy = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"],
        "status": "draft",
        "type": {"$ne": "scenario"}
    }, sort=[("start_date", -1)])
    
    if not fy:
        # Fallback to most recent actual exercise
        fy = fiscal_years_collection.find_one({
            "tenant_id": current_user["id"],
            "type": {"$ne": "scenario"}
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
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    company_id = str(company["_id"]) if company else None

    existing = fiscal_years_collection.find_one({
        "tenant_id": current_user["id"], "year": fy.year, "type": {"$ne": "scenario"}
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Un exercice fiscal existe deja pour l'annee {fy.year}")

    fy_doc = {
        "name": f"Exercice {fy.year}",
        "year": fy.year,
        "start_date": f"{fy.year}-01-01",
        "end_date": f"{fy.year}-12-31",
        "status": "draft",
        "type": "actual",
        "tenant_id": current_user["id"],
        "company_id": company_id,
        "context": _initialize_fy_context(current_user["id"], fy.year),
        "created_at": datetime.now(timezone.utc).isoformat(),
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
        raw_scope = activity.get("scope", "scope1")
        category = activity.get("category_id", "other")
        emissions = activity.get("emissions", 0) or 0
        
        # Normaliser le scope pour le reporting (scope3_3 → scope3_amont, etc.)
        normalized_scope = normalize_scope_for_reporting(raw_scope, category)
        
        if normalized_scope in scope_emissions:
            scope_emissions[normalized_scope] += emissions
    
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
    """Duplicate a fiscal year to a new year, optionally as a scenario"""
    fy = fiscal_years_collection.find_one({
        "_id": ObjectId(fiscal_year_id), "tenant_id": current_user["id"]
    })
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")

    scenario_name, scenario_id = _resolve_scenario_info(data)
    _validate_duplicate_target(data, current_user["id"], scenario_id)

    new_start_date = f"{data.new_year}-01-01"
    name = f"Scenario {data.new_year} — {scenario_name}" if data.is_scenario else f"Exercice {data.new_year}"

    new_fy = {
        "name": name,
        "year": data.new_year,
        "start_date": new_start_date,
        "end_date": f"{data.new_year}-12-31",
        "status": "draft",
        "type": "scenario" if data.is_scenario else "actual",
        "tenant_id": current_user["id"],
        "company_id": fy.get("company_id"),
        "context": _resolve_context_from_source_or_company(fy.get("context", {}), current_user["id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "duplicated_from": fiscal_year_id,
    }

    if data.is_scenario:
        new_fy["scenario_name"] = scenario_name
        new_fy["reference_fiscal_year_id"] = fiscal_year_id
        if scenario_id:
            new_fy["scenario_id"] = scenario_id

    result = fiscal_years_collection.insert_one(new_fy)
    new_fy_id = str(result.inserted_id)

    duplicated_count = 0
    if data.duplicate_activities:
        duplicated_count = _duplicate_activities(
            str(fy["_id"]), new_fy_id, new_start_date,
            current_user["id"], data.activity_ids_to_duplicate,
        )

    return {
        "id": new_fy_id,
        "message": "Fiscal year duplicated successfully",
        "duplicated_activities": duplicated_count,
        "type": "scenario" if data.is_scenario else "actual",
    }



@router.get("/scenarios/{year}")
async def get_scenarios_for_year(year: int, current_user: dict = Depends(get_current_user)):
    """Get all scenarios for a specific year"""
    scenarios = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"],
        "year": year,
        "type": "scenario"
    }).sort("created_at", -1))
    
    result = []
    for s in scenarios:
        s_data = serialize_doc(s)
        s_data["activities_count"] = activities_collection.count_documents({
            "tenant_id": current_user["id"],
            "fiscal_year_id": str(s["_id"])
        })
        result.append(s_data)
    
    return result


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
