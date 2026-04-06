"""
Routes pour la gestion des activités
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List
import uuid

import sys
sys.path.append('/app/backend')

from config import (
    activities_collection, 
    emission_factors_collection,
    fiscal_years_collection
)
from models import ActivityCreate, ActivityUpdate, ActivityGroupUpdate
from services.auth import get_current_user
from services.emissions import create_factor_snapshot
from services.scope_mapping import normalize_scope_for_reporting
from services.activity_service import (
    normalize_scope, apply_business_rules, resolve_activity_date,
    resolve_quantity, resolve_quantity_from_values,
    compute_dual_reporting, recalculate_emissions,
)
from utils import serialize_doc, find_emission_factor

router = APIRouter(prefix="/activities", tags=["Activities"])


def _compute_impact_emissions(activity: ActivityCreate, factor: dict, impact: dict) -> dict:
    """Compute emissions, scope normalization, and dual reporting for an impact."""
    quantity = resolve_quantity(activity, factor)
    emissions = quantity * impact.get("value", 0)
    activity_date = resolve_activity_date(activity.date, activity.fiscal_year_id)
    impact_scope = normalize_scope(impact.get("scope", activity.scope))
    display_category = "activites_combustibles_energie" if impact_scope == "scope3_3" else activity.category_id
    stored_scope = normalize_scope_for_reporting(impact_scope, display_category)
    emissions_location, location_factor_snapshot = compute_dual_reporting(factor, impact_scope, quantity)
    return {
        "quantity": quantity, "emissions": emissions, "activity_date": activity_date,
        "impact_scope": impact_scope, "display_category": display_category,
        "stored_scope": stored_scope, "emissions_location": emissions_location,
        "location_factor_snapshot": location_factor_snapshot,
    }


def _get_factor_impacts(factor: dict, activity: ActivityCreate) -> list:
    """Get impacts from factor, with fallback for legacy format."""
    all_impacts = factor.get("impacts", [])
    if all_impacts:
        return all_impacts
    return [{
        "scope": factor.get("scope", activity.scope),
        "category": factor.get("category", activity.category_id),
        "value": factor.get("value", 0),
        "unit": factor.get("unit", "kgCO2e"),
        "type": "direct",
    }]


async def create_activity_for_impact(
    activity: ActivityCreate,
    current_user: dict,
    factor: dict,
    impact: dict,
    group_id: str,
    group_index: int,
    group_size: int
) -> dict:
    """Cree une activite pour un impact specifique"""
    calc = _compute_impact_emissions(activity, factor, impact)

    activity_doc = {
        "group_id": group_id,
        "group_index": group_index,
        "group_size": group_size,
        "entry_scope": activity.entry_scope or activity.scope,
        "entry_category": activity.entry_category or activity.category_id,
        "scope": calc["stored_scope"],
        "category_id": calc["display_category"],
        "subcategory_id": activity.subcategory_id,
        "impact_value": impact.get("value", 0),
        "impact_unit": impact.get("unit", "kgCO2e"),
        "name": activity.name,
        "quantity": activity.quantity,
        "unit": activity.unit,
        "emission_factor_id": activity.emission_factor_id,
        "factor_snapshot": create_factor_snapshot(factor),
        "original_quantity": activity.original_quantity if activity.original_quantity is not None else activity.quantity,
        "original_unit": activity.original_unit or activity.unit,
        "conversion_factor": activity.conversion_factor,
        "emissions": calc["emissions"],
        "calculated_emissions": calc["emissions"],
        "reporting_method": factor.get("reporting_method", "location"),
        "emissions_location": calc["emissions_location"],
        "location_factor_snapshot": calc["location_factor_snapshot"],
        "tenant_id": current_user["id"],
        "company_id": current_user.get("company_id"),
        "fiscal_year_id": activity.fiscal_year_id,
        "date": calc["activity_date"],
        "comments": activity.comments,
        "description": activity.description,
        "source": activity.source,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
    }

    result = activities_collection.insert_one(activity_doc)
    activity_doc["id"] = str(result.inserted_id)

    return serialize_doc(activity_doc)


# ==================== ENDPOINTS ====================


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
    """
    Cree une ou plusieurs activites selon les impacts du facteur.
    Pour les facteurs multi-impacts, applique les regles metier GHG Protocol
    et cree une activite par impact filtre, liees par un group_id commun.
    """
    factor = find_emission_factor(emission_factors_collection, activity.emission_factor_id)

    if not factor:
        return await create_single_activity(activity, current_user)

    all_impacts = _get_factor_impacts(factor, activity)
    entry_scope = activity.entry_scope or activity.scope
    entry_category = activity.entry_category or activity.category_id
    filtered_impacts = apply_business_rules(all_impacts, entry_scope, entry_category)

    if not filtered_impacts:
        raise HTTPException(
            status_code=400,
            detail="Aucun impact applicable pour ce facteur dans ce contexte de saisie. "
                   "Verifiez la compatibilite entre le scope de saisie et le facteur selectionne.",
        )

    group_id = f"grp_{uuid.uuid4().hex[:12]}"
    created_activities = [
        await create_activity_for_impact(
            activity=activity, current_user=current_user, factor=factor,
            impact=impact, group_id=group_id, group_index=idx, group_size=len(filtered_impacts),
        )
        for idx, impact in enumerate(filtered_impacts)
    ]

    if len(created_activities) == 1:
        return created_activities[0]

    return {"group_id": group_id, "activities": created_activities, "count": len(created_activities)}


async def create_single_activity(activity: ActivityCreate, current_user: dict) -> dict:
    """Crée une activité simple (sans facteur ou facteur manuel)"""
    activity_doc = activity.model_dump()
    activity_doc["tenant_id"] = current_user["id"]
    activity_doc["company_id"] = current_user.get("company_id")
    activity_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Champs de groupement (activité simple = pas de groupe)
    activity_doc["group_id"] = None
    activity_doc["group_index"] = 0
    activity_doc["group_size"] = 1
    activity_doc["entry_scope"] = activity.entry_scope or activity.scope
    activity_doc["entry_category"] = activity.entry_category or activity.category_id
    
    # Set date based on fiscal year if provided
    if not activity_doc.get("date"):
        activity_doc["date"] = resolve_activity_date(None, activity_doc.get("fiscal_year_id"))
    
    # Calculate emissions for manual factor
    emissions = 0
    if activity.manual_emission_factor:
        emissions = activity.quantity * activity.manual_emission_factor
    
    activity_doc["emissions"] = emissions
    activity_doc["calculated_emissions"] = emissions
    activity_doc["factor_snapshot"] = None
    activity_doc["original_quantity"] = activity.original_quantity if activity.original_quantity is not None else activity.quantity
    activity_doc["original_unit"] = activity.original_unit or activity.unit
    activity_doc["conversion_factor"] = activity.conversion_factor
    
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
    
    if "quantity" in update_data or "emission_factor_id" in update_data:
        existing = activities_collection.find_one({
            "_id": ObjectId(activity_id),
            "tenant_id": current_user["id"]
        })
        if existing:
            update_data = recalculate_emissions(existing, update_data)
    
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
            factor = find_emission_factor(emission_factors_collection, activity.emission_factor_id)
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


# ==================== ENDPOINTS DE GROUPE (MULTI-IMPACTS) ====================

@router.get("/groups/{group_id}")
async def get_activity_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère toutes les activités d'un groupe multi-impacts"""
    activities = list(activities_collection.find({
        "group_id": group_id,
        "tenant_id": current_user["id"]
    }).sort("group_index", 1))
    
    if not activities:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    return {
        "group_id": group_id,
        "activities": [serialize_doc(a) for a in activities],
        "count": len(activities)
    }


def _build_simple_updates(update) -> dict:
    """Extrait les champs simples à mettre à jour sur un groupe."""
    updates = {}
    if update.name is not None:
        updates["name"] = update.name
    if update.comments is not None:
        updates["comments"] = update.comments
    if update.unit is not None:
        updates["unit"] = update.unit
    return updates


async def _recreate_group(group_id, update, main_activity, current_user):
    """Supprime l'ancien groupe et recrée avec un nouveau facteur."""
    activities_collection.delete_many({
        "group_id": group_id,
        "tenant_id": current_user["id"]
    })
    new_activity = ActivityCreate(
        category_id=update.category_id or main_activity["entry_category"],
        subcategory_id=update.subcategory_id or main_activity.get("subcategory_id"),
        scope=main_activity["entry_scope"],
        name=update.name or main_activity["name"],
        quantity=update.quantity or main_activity["quantity"],
        unit=update.unit or main_activity["unit"],
        emission_factor_id=update.emission_factor_id,
        entry_scope=main_activity["entry_scope"],
        entry_category=main_activity["entry_category"],
        fiscal_year_id=main_activity.get("fiscal_year_id"),
        comments=update.comments if update.comments is not None else main_activity.get("comments")
    )
    return await create_activity(new_activity, current_user)


def _update_group_quantity(activities, new_quantity, old_quantity):
    """Met à jour la quantité d'un groupe proportionnellement."""
    ratio = new_quantity / old_quantity
    for activity in activities:
        new_emissions = activity["emissions"] * ratio
        activities_collection.update_one(
            {"_id": activity["_id"]},
            {"$set": {
                "quantity": new_quantity,
                "emissions": new_emissions,
                "calculated_emissions": new_emissions,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


@router.put("/groups/{group_id}")
async def update_activity_group(
    group_id: str,
    update: ActivityGroupUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour toutes les activités d'un groupe multi-impacts."""
    
    activities = list(activities_collection.find({
        "group_id": group_id,
        "tenant_id": current_user["id"]
    }).sort("group_index", 1))
    
    if not activities:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    main_activity = activities[0]
    
    # Changement de facteur → supprimer et recréer
    if update.emission_factor_id and update.emission_factor_id != main_activity.get("emission_factor_id"):
        return await _recreate_group(group_id, update, main_activity, current_user)
    
    # Changement de quantité → mise à jour proportionnelle
    if update.quantity and update.quantity != main_activity["quantity"]:
        _update_group_quantity(activities, update.quantity, main_activity["quantity"])
    
    # Champs simples
    simple_updates = _build_simple_updates(update)
    if simple_updates:
        simple_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        activities_collection.update_many(
            {"group_id": group_id, "tenant_id": current_user["id"]},
            {"$set": simple_updates}
        )
    
    updated_activities = list(activities_collection.find({
        "group_id": group_id, "tenant_id": current_user["id"]
    }).sort("group_index", 1))
    
    return {
        "group_id": group_id,
        "activities": [serialize_doc(a) for a in updated_activities],
        "count": len(updated_activities)
    }


@router.delete("/groups/{group_id}")
async def delete_activity_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime toutes les activités d'un groupe multi-impacts"""
    
    result = activities_collection.delete_many({
        "group_id": group_id,
        "tenant_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    return {
        "message": f"Groupe supprimé ({result.deleted_count} activités)",
        "deleted": result.deleted_count,
        "group_id": group_id
    }
