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
from utils import serialize_doc

router = APIRouter(prefix="/activities", tags=["Activities"])


# ==================== RÈGLES MÉTIER MULTI-IMPACTS ====================

def apply_business_rules(impacts: list, entry_scope: str, entry_category: str) -> list:
    """
    Filtre les impacts selon les règles GHG Protocol.
    
    Règles:
    - Saisie Scope 1, 2 ou 3.3 → inclure Scope 1, 2 et 3.3 (amont énergie)
    - Saisie Scope 3 (hors 3.3) → exclure Scope 1, 2 et 3.3
    """
    if not impacts:
        return impacts
    
    is_scope3_entry = entry_scope.startswith('scope3') if entry_scope else False
    is_scope33_category = entry_category == 'activites_combustibles_energie'
    
    filtered = []
    for impact in impacts:
        impact_scope = impact.get('scope', '')
        is_impact_scope33 = impact.get('category') == 'activites_combustibles_energie'
        
        if is_scope3_entry and not is_scope33_category:
            # Saisie Scope 3 (hors 3.3) : exclure Scope 1, 2 et 3.3
            if impact_scope in ['scope1', 'scope2']:
                continue
            if is_impact_scope33:
                continue
        else:
            # Saisie Scope 1, 2 ou 3.3 : inclure Scope 1, 2 et 3.3 uniquement
            if impact_scope not in ['scope1', 'scope2'] and not is_impact_scope33:
                # Exclure les autres Scope 3 sauf si c'est le même scope que la saisie
                if impact_scope != entry_scope:
                    continue
        
        filtered.append(impact)
    
    return filtered


async def create_activity_for_impact(
    activity: ActivityCreate,
    current_user: dict,
    factor: dict,
    impact: dict,
    group_id: str,
    group_index: int,
    group_size: int
) -> dict:
    """Crée une activité pour un impact spécifique"""
    
    # Calculer les émissions pour cet impact
    quantity = activity.quantity
    default_unit = factor.get("default_unit", activity.unit)
    
    # Conversion d'unité si nécessaire
    if activity.unit != default_unit:
        unit_conversions = factor.get("unit_conversions", {})
        conversion_key = f"{activity.unit}_to_{default_unit}"
        if conversion_key in unit_conversions:
            quantity = quantity * unit_conversions[conversion_key]
    
    emissions = quantity * impact.get("value", 0)
    
    # Déterminer la date
    activity_date = activity.date
    if not activity_date and activity.fiscal_year_id:
        fy = fiscal_years_collection.find_one({"_id": ObjectId(activity.fiscal_year_id)})
        if fy:
            start = fy.get("start_date", "")[:10]
            end = fy.get("end_date", "")[:10]
            if start and end:
                from datetime import datetime as dt
                start_dt = dt.strptime(start, "%Y-%m-%d")
                end_dt = dt.strptime(end, "%Y-%m-%d")
                mid_dt = start_dt + (end_dt - start_dt) / 2
                activity_date = mid_dt.strftime("%Y-%m-%d")
    if not activity_date:
        activity_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Construire le document
    activity_doc = {
        # Groupement
        "group_id": group_id,
        "group_index": group_index,
        "group_size": group_size,
        
        # Contexte de saisie original
        "entry_scope": activity.entry_scope or activity.scope,
        "entry_category": activity.entry_category or activity.category_id,
        
        # Données de l'impact
        "scope": impact.get("scope", activity.scope),
        "category_id": impact.get("category", activity.category_id),
        "subcategory_id": activity.subcategory_id,
        "impact_type": impact.get("type", "direct"),
        "impact_value": impact.get("value", 0),
        "impact_unit": impact.get("unit", "kgCO2e"),
        
        # Données communes
        "name": activity.name,
        "quantity": activity.quantity,
        "unit": activity.unit,
        "emission_factor_id": activity.emission_factor_id,
        "factor_snapshot": create_factor_snapshot(factor),
        "original_quantity": activity.quantity,
        "original_unit": activity.unit,
        
        # Émissions calculées
        "emissions": emissions,
        "calculated_emissions": emissions,
        
        # Métadonnées
        "tenant_id": current_user["id"],
        "company_id": current_user.get("company_id"),
        "fiscal_year_id": activity.fiscal_year_id,
        "date": activity_date,
        "comments": activity.comments,
        "description": activity.description,
        "source": activity.source,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
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
    Crée une ou plusieurs activités selon les impacts du facteur.
    
    Pour les facteurs multi-impacts, applique les règles métier GHG Protocol
    et crée une activité par impact filtré, liées par un group_id commun.
    """
    
    # Récupérer le facteur d'émission
    factor = None
    if activity.emission_factor_id:
        factor = emission_factors_collection.find_one({"_id": ObjectId(activity.emission_factor_id)})
    
    # Si pas de facteur ou facteur manuel, créer une activité simple
    if not factor:
        return await create_single_activity(activity, current_user)
    
    # Récupérer les impacts du facteur
    all_impacts = factor.get("impacts", [])
    
    # Fallback si pas d'impacts structurés (ancien format de facteur)
    if not all_impacts:
        all_impacts = [{
            "scope": factor.get("scope", activity.scope),
            "category": factor.get("category", activity.category_id),
            "value": factor.get("value", 0),
            "unit": factor.get("unit", "kgCO2e"),
            "type": "direct"
        }]
    
    # Déterminer le scope et la catégorie de saisie
    entry_scope = activity.entry_scope or activity.scope
    entry_category = activity.entry_category or activity.category_id
    
    # Appliquer les règles métier pour filtrer les impacts
    filtered_impacts = apply_business_rules(all_impacts, entry_scope, entry_category)
    
    # Si aucun impact applicable après filtrage
    if not filtered_impacts:
        raise HTTPException(
            status_code=400, 
            detail="Aucun impact applicable pour ce facteur dans ce contexte de saisie. "
                   "Vérifiez la compatibilité entre le scope de saisie et le facteur sélectionné."
        )
    
    # Générer un group_id unique
    group_id = f"grp_{uuid.uuid4().hex[:12]}"
    group_size = len(filtered_impacts)
    
    # Créer une activité par impact filtré
    created_activities = []
    for index, impact in enumerate(filtered_impacts):
        activity_doc = await create_activity_for_impact(
            activity=activity,
            current_user=current_user,
            factor=factor,
            impact=impact,
            group_id=group_id,
            group_index=index,
            group_size=group_size
        )
        created_activities.append(activity_doc)
    
    # Retourner la réponse
    # Si une seule activité, retourner le format simple pour compatibilité
    if len(created_activities) == 1:
        return created_activities[0]
    
    # Sinon, retourner le format groupe
    return {
        "group_id": group_id,
        "activities": created_activities,
        "count": len(created_activities)
    }


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
        if activity_doc.get("fiscal_year_id"):
            fy = fiscal_years_collection.find_one({"_id": ObjectId(activity_doc["fiscal_year_id"])})
            if fy:
                start = fy.get("start_date", "")[:10]
                end = fy.get("end_date", "")[:10]
                if start and end:
                    from datetime import datetime as dt
                    start_dt = dt.strptime(start, "%Y-%m-%d")
                    end_dt = dt.strptime(end, "%Y-%m-%d")
                    mid_dt = start_dt + (end_dt - start_dt) / 2
                    activity_doc["date"] = mid_dt.strftime("%Y-%m-%d")
                else:
                    activity_doc["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            else:
                activity_doc["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        else:
            activity_doc["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Calculate emissions for manual factor
    emissions = 0
    if activity.manual_emission_factor:
        emissions = activity.quantity * activity.manual_emission_factor
    
    activity_doc["emissions"] = emissions
    activity_doc["calculated_emissions"] = emissions
    activity_doc["factor_snapshot"] = None
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


@router.put("/groups/{group_id}")
async def update_activity_group(
    group_id: str,
    update: ActivityGroupUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Met à jour toutes les activités d'un groupe multi-impacts.
    
    - Si changement de quantité : recalcule les émissions proportionnellement
    - Si changement de facteur : supprime et recrée toutes les activités
    - Si changement de commentaires : met à jour toutes les activités
    """
    
    # Récupérer toutes les activités du groupe
    activities = list(activities_collection.find({
        "group_id": group_id,
        "tenant_id": current_user["id"]
    }).sort("group_index", 1))
    
    if not activities:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    main_activity = activities[0]
    
    # Si changement de facteur → supprimer et recréer tout le groupe
    if update.emission_factor_id and update.emission_factor_id != main_activity.get("emission_factor_id"):
        # Supprimer les anciennes activités
        activities_collection.delete_many({
            "group_id": group_id,
            "tenant_id": current_user["id"]
        })
        
        # Recréer avec le nouveau facteur
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
    
    # Si changement de quantité → mise à jour proportionnelle
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.quantity and update.quantity != main_activity["quantity"]:
        ratio = update.quantity / main_activity["quantity"]
        
        for activity in activities:
            new_emissions = activity["emissions"] * ratio
            activities_collection.update_one(
                {"_id": activity["_id"]},
                {"$set": {
                    "quantity": update.quantity,
                    "emissions": new_emissions,
                    "calculated_emissions": new_emissions,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Mise à jour des champs simples
    simple_updates = {}
    if update.name is not None:
        simple_updates["name"] = update.name
    if update.comments is not None:
        simple_updates["comments"] = update.comments
    if update.unit is not None:
        simple_updates["unit"] = update.unit
    
    if simple_updates:
        simple_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        activities_collection.update_many(
            {"group_id": group_id, "tenant_id": current_user["id"]},
            {"$set": simple_updates}
        )
    
    # Retourner le groupe mis à jour
    updated_activities = list(activities_collection.find({
        "group_id": group_id,
        "tenant_id": current_user["id"]
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
