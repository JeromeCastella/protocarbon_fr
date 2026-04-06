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
from utils import serialize_doc, find_emission_factor

router = APIRouter(prefix="/activities", tags=["Activities"])


# ==================== RÈGLES MÉTIER MULTI-IMPACTS ====================

def normalize_scope(scope: str) -> str:
    """Normalise les différentes notations de scope vers un format standard."""
    if not scope:
        return ''
    
    scope_lower = scope.lower().strip()
    
    # Normalisation du Scope 3.3 (amont énergie) - catégorie spécifique du GHG Protocol
    # NOTE: scope3_amont (Scope 3 Amont) n'est PAS scope3_3 (catégorie 3.3)
    if scope_lower in ['scope3_3', 'scope3.3', 'scope33']:
        return 'scope3_3'
    
    return scope_lower


def apply_business_rules(impacts: list, entry_scope: str, entry_category: str) -> list:
    """
    Filtre les impacts selon les règles GHG Protocol.
    
    Règles:
    - Saisie Scope 1 ou Scope 2 → inclure impacts scope1, scope2, scope3_3
    - Saisie Scope 3.3 (catégorie activites_combustibles_energie) → inclure uniquement scope3_3
    - Saisie Scope 3 (autres catégories) → inclure uniquement scope3
    - Si value = 0 → ne pas créer de ligne
    
    Les impacts sont identifiés par leur champ 'scope' uniquement :
    - scope1 : Émissions directes
    - scope2 : Émissions indirectes (électricité)
    - scope3_3 : Amont énergie (catégorie 3.3 du GHG Protocol)
    - scope3 : Autres émissions Scope 3
    """
    if not impacts:
        return impacts
    
    # Normaliser le scope de saisie
    normalized_entry_scope = normalize_scope(entry_scope) if entry_scope else ''
    
    # Déterminer le type de saisie
    is_scope1_or_2_entry = normalized_entry_scope in ['scope1', 'scope2']
    
    # Catégorie 3.3 du GHG Protocol : activités liées aux combustibles et à l'énergie
    is_scope3_3_entry = (
        entry_category == 'activites_combustibles_energie' or 
        normalized_entry_scope == 'scope3_3'
    )
    
    # Autres catégories Scope 3
    is_scope3_entry = (
        normalized_entry_scope.startswith('scope3') and 
        not is_scope3_3_entry
    )
    
    filtered = []
    for impact in impacts:
        # Normaliser le scope de l'impact
        impact_scope = normalize_scope(impact.get('scope', ''))
        impact_value = impact.get('value', 0)
        
        # Règle : Exclure les impacts avec valeur = 0
        if impact_value == 0:
            continue
        
        if is_scope1_or_2_entry:
            # Saisie Scope 1 ou 2 : inclure scope1, scope2, scope3_3
            if impact_scope not in ['scope1', 'scope2', 'scope3_3']:
                continue
        elif is_scope3_3_entry:
            # Saisie Scope 3.3 (amont énergie) : inclure uniquement scope3_3
            if impact_scope != 'scope3_3':
                continue
        elif is_scope3_entry:
            # Saisie Scope 3 (autres) : inclure uniquement scope3
            if impact_scope != 'scope3':
                continue
        else:
            # Fallback : inclure tous les impacts non-nuls
            pass
        
        filtered.append(impact)
    
    return filtered


def resolve_activity_date(activity_date, fiscal_year_id):
    """Résout la date d'activité : date fournie > milieu de l'exercice fiscal > date du jour."""
    if activity_date:
        return activity_date
    if fiscal_year_id:
        fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
        if fy:
            start = fy.get("start_date", "")[:10]
            end = fy.get("end_date", "")[:10]
            if start and end:
                from datetime import datetime as dt
                start_dt = dt.strptime(start, "%Y-%m-%d")
                end_dt = dt.strptime(end, "%Y-%m-%d")
                mid_dt = start_dt + (end_dt - start_dt) / 2
                return mid_dt.strftime("%Y-%m-%d")
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def resolve_quantity(activity, factor):
    """Résout la quantité en tenant compte des conversions d'unité."""
    quantity = activity.quantity
    default_unit = factor.get("default_unit", activity.unit)

    if activity.original_quantity is not None and activity.conversion_factor is not None:
        return quantity

    if activity.unit != default_unit:
        unit_conversions = factor.get("unit_conversions", {})
        conversion_key = f"{activity.unit}_to_{default_unit}"
        if conversion_key in unit_conversions:
            quantity = quantity * unit_conversions[conversion_key]

    return quantity


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
    
    quantity = resolve_quantity(activity, factor)
    emissions = quantity * impact.get("value", 0)
    activity_date = resolve_activity_date(activity.date, activity.fiscal_year_id)
    
    impact_scope = normalize_scope(impact.get("scope", activity.scope))
    display_category = 'activites_combustibles_energie' if impact_scope == 'scope3_3' else activity.category_id
    stored_scope = normalize_scope_for_reporting(impact_scope, display_category)
    
    # Dual reporting: if factor is market-based, calculate location-based emissions
    emissions_location = None
    location_factor_snapshot = None
    if factor.get("reporting_method") == "market" and factor.get("location_factor_id"):
        loc_factor = emission_factors_collection.find_one(
            {"id": factor["location_factor_id"], "deleted_at": None}
        )
        if not loc_factor:
            try:
                loc_factor = emission_factors_collection.find_one(
                    {"_id": ObjectId(factor["location_factor_id"]), "deleted_at": None}
                )
            except Exception:
                pass
        if loc_factor:
            loc_impacts = loc_factor.get("impacts", [])
            matching_impact = next(
                (i for i in loc_impacts if normalize_scope(i.get("scope", "")) == impact_scope),
                loc_impacts[0] if loc_impacts else None
            )
            if matching_impact:
                emissions_location = quantity * matching_impact.get("value", 0)
            location_factor_snapshot = create_factor_snapshot(loc_factor)

    # Construire le document
    activity_doc = {
        # Groupement
        "group_id": group_id,
        "group_index": group_index,
        "group_size": group_size,
        
        # Contexte de saisie original
        "entry_scope": activity.entry_scope or activity.scope,
        "entry_category": activity.entry_category or activity.category_id,
        
        # Données de l'impact (scope résolu pour le reporting)
        "scope": stored_scope,
        "category_id": display_category,  # Catégorie d'affichage selon les règles GHG
        "subcategory_id": activity.subcategory_id,
        "impact_value": impact.get("value", 0),
        "impact_unit": impact.get("unit", "kgCO2e"),
        
        # Données communes
        "name": activity.name,
        "quantity": activity.quantity,
        "unit": activity.unit,
        "emission_factor_id": activity.emission_factor_id,
        "factor_snapshot": create_factor_snapshot(factor),
        "original_quantity": activity.original_quantity if activity.original_quantity is not None else activity.quantity,
        "original_unit": activity.original_unit or activity.unit,
        "conversion_factor": activity.conversion_factor,
        
        # Émissions calculées
        "emissions": emissions,
        "calculated_emissions": emissions,
        
        # Dual reporting (location-based)
        "reporting_method": factor.get("reporting_method", "location"),
        "emissions_location": emissions_location,
        "location_factor_snapshot": location_factor_snapshot,
        
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
    factor = find_emission_factor(emission_factors_collection, activity.emission_factor_id)
    
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
def recalculate_emissions(existing: dict, update_data: dict) -> dict:
    """Recalcule les émissions si la quantité ou le facteur a changé."""
    quantity = update_data.get("quantity", existing.get("quantity", 0))
    factor_id = update_data.get("emission_factor_id", existing.get("emission_factor_id"))
    if not factor_id:
        return update_data

    factor = find_emission_factor(emission_factors_collection, factor_id)
    if not factor:
        return update_data

    unit = update_data.get("unit", existing.get("unit", ""))
    quantity = resolve_quantity_from_values(quantity, unit, factor)

    emissions = sum(quantity * imp.get("value", 0) for imp in factor.get("impacts", []))
    update_data["emissions"] = emissions
    update_data["calculated_emissions"] = emissions
    update_data["factor_snapshot"] = create_factor_snapshot(factor)
    return update_data


def resolve_quantity_from_values(quantity: float, unit: str, factor: dict) -> float:
    """Applique la conversion d'unité si nécessaire."""
    default_unit = factor.get("default_unit", unit)
    if unit == default_unit:
        return quantity
    unit_conversions = factor.get("unit_conversions", {})
    conversion_key = f"{unit}_to_{default_unit}"
    if conversion_key in unit_conversions:
        return quantity * unit_conversions[conversion_key]
    return quantity


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
