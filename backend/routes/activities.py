"""
Routes pour la gestion des activités
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List

import sys
sys.path.append('/app/backend')

from config import (
    activities_collection, 
    emission_factors_collection,
    fiscal_years_collection
)
from models import ActivityCreate, ActivityUpdate
from services.auth import get_current_user
from services.emissions import create_factor_snapshot
from utils import serialize_doc

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("")
async def get_activities(
    scope: Optional[str] = None, 
    category_id: Optional[str] = None,
    fiscal_year_id: Optional[str] = None,
    page: int = 1,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get activities with pagination and filters"""
    query = {"tenant_id": current_user["id"]}
    if scope:
        query["scope"] = scope
    if category_id:
        query["category_id"] = category_id
    
    # Filter by fiscal year date range if specified
    if fiscal_year_id:
        fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
        if fy:
            start_date = fy.get("start_date", "")
            end_date = fy.get("end_date", "")
            # Handle both ISO format (2024-01-01T00:00:00) and simple format (2024-01-01)
            # by using regex to match the date prefix
            if start_date and end_date:
                query["$expr"] = {
                    "$and": [
                        {"$gte": [{"$substr": ["$date", 0, 10]}, start_date]},
                        {"$lte": [{"$substr": ["$date", 0, 10]}, end_date]}
                    ]
                }
    
    # Count total for pagination metadata
    total = activities_collection.count_documents(query)
    
    # Apply pagination with index-friendly sort
    skip = (page - 1) * limit
    activities = list(
        activities_collection.find(query)
        .sort("date", -1)
        .skip(skip)
        .limit(limit)
    )
    
    return {
        "data": [serialize_doc(a) for a in activities],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("")
async def create_activity(activity: ActivityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new activity"""
    activity_doc = activity.model_dump()
    activity_doc["tenant_id"] = current_user["id"]
    activity_doc["company_id"] = current_user.get("company_id")
    activity_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Set date if not provided
    if not activity_doc.get("date"):
        activity_doc["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Calculate emissions if emission factor is provided
    emissions = 0
    factor_snapshot = None
    
    if activity.emission_factor_id:
        factor = emission_factors_collection.find_one({"_id": ObjectId(activity.emission_factor_id)})
        if factor:
            # Create snapshot for immutability
            factor_snapshot = create_factor_snapshot(factor)
            
            # Calculate emissions based on factor type
            quantity = activity.quantity
            
            # Handle unit conversion
            default_unit = factor.get("default_unit", activity.unit)
            if activity.unit != default_unit:
                unit_conversions = factor.get("unit_conversions", {})
                conversion_key = f"{activity.unit}_to_{default_unit}"
                if conversion_key in unit_conversions:
                    quantity = quantity * unit_conversions[conversion_key]
            
            # Sum all impacts
            impacts = factor.get("impacts", [])
            for impact in impacts:
                emissions += quantity * impact.get("value", 0)
    
    elif activity.manual_emission_factor:
        emissions = activity.quantity * activity.manual_emission_factor
    
    activity_doc["emissions"] = emissions
    activity_doc["calculated_emissions"] = emissions
    activity_doc["factor_snapshot"] = factor_snapshot
    activity_doc["original_quantity"] = activity.quantity
    activity_doc["original_unit"] = activity.unit
    
    result = activities_collection.insert_one(activity_doc)
    activity_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(activity_doc)


@router.get("/{activity_id}")
async def get_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific activity"""
    activity = activities_collection.find_one({
        "_id": ObjectId(activity_id),
        "tenant_id": current_user["id"]
    })
    
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return serialize_doc(activity)


@router.put("/{activity_id}")
async def update_activity(
    activity_id: str, 
    activity: ActivityUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update an activity"""
    update_data = {k: v for k, v in activity.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate emissions if quantity or factor changed
    if "quantity" in update_data or "emission_factor_id" in update_data:
        existing = activities_collection.find_one({
            "_id": ObjectId(activity_id),
            "tenant_id": current_user["id"]
        })
        
        if existing:
            quantity = update_data.get("quantity", existing.get("quantity", 0))
            factor_id = update_data.get("emission_factor_id", existing.get("emission_factor_id"))
            
            if factor_id:
                factor = emission_factors_collection.find_one({"_id": ObjectId(factor_id)})
                if factor:
                    emissions = 0
                    unit = update_data.get("unit", existing.get("unit", ""))
                    default_unit = factor.get("default_unit", unit)
                    
                    if unit != default_unit:
                        unit_conversions = factor.get("unit_conversions", {})
                        conversion_key = f"{unit}_to_{default_unit}"
                        if conversion_key in unit_conversions:
                            quantity = quantity * unit_conversions[conversion_key]
                    
                    for impact in factor.get("impacts", []):
                        emissions += quantity * impact.get("value", 0)
                    
                    update_data["emissions"] = emissions
                    update_data["calculated_emissions"] = emissions
                    update_data["factor_snapshot"] = create_factor_snapshot(factor)
    
    result = activities_collection.update_one(
        {"_id": ObjectId(activity_id), "tenant_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    updated = activities_collection.find_one({"_id": ObjectId(activity_id)})
    return serialize_doc(updated)


@router.delete("/{activity_id}")
async def delete_activity(activity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an activity"""
    result = activities_collection.delete_one({
        "_id": ObjectId(activity_id),
        "tenant_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return {"message": "Activity deleted"}


@router.post("/bulk")
async def create_activities_bulk(
    activities: List[ActivityCreate], 
    current_user: dict = Depends(get_current_user)
):
    """Create multiple activities at once"""
    created = []
    
    for activity in activities:
        activity_doc = activity.model_dump()
        activity_doc["tenant_id"] = current_user["id"]
        activity_doc["company_id"] = current_user.get("company_id")
        activity_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        
        if not activity_doc.get("date"):
            activity_doc["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Calculate emissions
        emissions = 0
        if activity.emission_factor_id:
            factor = emission_factors_collection.find_one({"_id": ObjectId(activity.emission_factor_id)})
            if factor:
                for impact in factor.get("impacts", []):
                    emissions += activity.quantity * impact.get("value", 0)
                activity_doc["factor_snapshot"] = create_factor_snapshot(factor)
        elif activity.manual_emission_factor:
            emissions = activity.quantity * activity.manual_emission_factor
        
        activity_doc["emissions"] = emissions
        activity_doc["calculated_emissions"] = emissions
        
        result = activities_collection.insert_one(activity_doc)
        activity_doc["id"] = str(result.inserted_id)
        created.append(serialize_doc(activity_doc))
    
    return {"created": len(created), "activities": created}
