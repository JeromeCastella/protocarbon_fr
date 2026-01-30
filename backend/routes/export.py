"""
Routes pour l'export des données
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import (
    fiscal_years_collection,
    activities_collection,
    products_collection,
    emission_factors_collection,
    subcategories_collection,
    unit_conversions_collection,
    carbon_objectives_collection,
    companies_collection
)
from services.auth import get_current_user

router = APIRouter(prefix="/export", tags=["Export"])


def serialize_for_export(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = [serialize_for_export(item) for item in value]
            elif isinstance(value, dict):
                result[key] = serialize_for_export(value)
            else:
                result[key] = value
        return result
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    return doc


@router.get("/full")
async def export_full_backup(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Export complete backup of all data for the current user.
    If fiscal_year_id is provided, activities will be filtered to that fiscal year.
    """
    tenant_id = current_user["id"]
    
    # Get company info
    company = companies_collection.find_one({"tenant_id": tenant_id})
    
    # Get fiscal years
    fiscal_years = list(fiscal_years_collection.find({"tenant_id": tenant_id}))
    
    # Validate fiscal_year_id if provided
    target_fiscal_year = None
    if fiscal_year_id:
        target_fiscal_year = fiscal_years_collection.find_one({
            "_id": ObjectId(fiscal_year_id),
            "tenant_id": tenant_id
        })
        if not target_fiscal_year:
            raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Get activities (filtered by fiscal year if specified)
    activities_query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        activities_query["fiscal_year_id"] = fiscal_year_id
    activities = list(activities_collection.find(activities_query))
    
    # Get products
    products = list(products_collection.find({"tenant_id": tenant_id}))
    
    # Get emission factors (global, no tenant filter)
    emission_factors = list(emission_factors_collection.find({}))
    
    # Get subcategories (global)
    subcategories = list(subcategories_collection.find({}))
    
    # Get unit conversions (global)
    unit_conversions = list(unit_conversions_collection.find({}))
    
    # Get carbon objectives
    objectives = list(carbon_objectives_collection.find({"tenant_id": tenant_id}))
    
    # Build export object
    export_data = {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": current_user.get("email"),
            "tenant_id": tenant_id,
            "fiscal_year_filter": fiscal_year_id,
            "fiscal_year_name": serialize_for_export(target_fiscal_year).get("name") if target_fiscal_year else "all",
            "version": "1.0"
        },
        "company": serialize_for_export(company),
        "fiscal_years": [serialize_for_export(fy) for fy in fiscal_years],
        "activities": [serialize_for_export(a) for a in activities],
        "products": [serialize_for_export(p) for p in products],
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors],
        "subcategories": [serialize_for_export(sc) for sc in subcategories],
        "unit_conversions": [serialize_for_export(uc) for uc in unit_conversions],
        "carbon_objectives": [serialize_for_export(obj) for obj in objectives],
        "statistics": {
            "total_activities": len(activities),
            "total_products": len(products),
            "total_emission_factors": len(emission_factors),
            "total_fiscal_years": len(fiscal_years),
            "total_objectives": len(objectives)
        }
    }
    
    return JSONResponse(content=export_data)


@router.get("/activities")
async def export_activities(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export only activities data"""
    tenant_id = current_user["id"]
    
    query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    
    activities = list(activities_collection.find(query))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "activities",
            "fiscal_year_filter": fiscal_year_id,
            "count": len(activities)
        },
        "activities": [serialize_for_export(a) for a in activities]
    }


@router.get("/products")
async def export_products(current_user: dict = Depends(get_current_user)):
    """Export only products data"""
    tenant_id = current_user["id"]
    
    products = list(products_collection.find({"tenant_id": tenant_id}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "products",
            "count": len(products)
        },
        "products": [serialize_for_export(p) for p in products]
    }


@router.get("/emission-factors")
async def export_emission_factors(current_user: dict = Depends(get_current_user)):
    """Export emission factors (global data)"""
    emission_factors = list(emission_factors_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "emission_factors",
            "count": len(emission_factors)
        },
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors]
    }


@router.get("/subcategories")
async def export_subcategories(current_user: dict = Depends(get_current_user)):
    """Export subcategories (global data)"""
    subcategories = list(subcategories_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "subcategories",
            "count": len(subcategories)
        },
        "subcategories": [serialize_for_export(sc) for sc in subcategories]
    }


@router.get("/reference-data")
async def export_reference_data(current_user: dict = Depends(get_current_user)):
    """Export all reference data (emission factors + subcategories + unit conversions)"""
    emission_factors = list(emission_factors_collection.find({}))
    subcategories = list(subcategories_collection.find({}))
    unit_conversions = list(unit_conversions_collection.find({}))
    
    return {
        "export_metadata": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "type": "reference_data",
            "version": "1.0"
        },
        "emission_factors": [serialize_for_export(ef) for ef in emission_factors],
        "subcategories": [serialize_for_export(sc) for sc in subcategories],
        "unit_conversions": [serialize_for_export(uc) for uc in unit_conversions],
        "statistics": {
            "total_emission_factors": len(emission_factors),
            "total_subcategories": len(subcategories),
            "total_unit_conversions": len(unit_conversions)
        }
    }

