"""
Routes pour les scénarios (entité de regroupement)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId

import sys
sys.path.append('/app/backend')

from config import scenarios_collection, fiscal_years_collection
from models import ScenarioCreate, ScenarioUpdate
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.get("")
async def list_scenarios(current_user: dict = Depends(get_current_user)):
    """List all scenarios for the user's company"""
    query = {"company_id": current_user.get("company_id")}
    scenarios = list(scenarios_collection.find(query).sort("created_at", -1))
    return [serialize_doc(s) for s in scenarios]


@router.post("")
async def create_scenario(
    data: ScenarioCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new scenario entity"""
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="Le nom du scénario est requis")

    doc = {
        "name": data.name.strip(),
        "description": (data.description or "").strip(),
        "company_id": current_user.get("company_id"),
        "tenant_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    result = scenarios_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return serialize_doc(doc)


@router.put("/{scenario_id}")
async def update_scenario(
    scenario_id: str,
    data: ScenarioUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a scenario's name or description"""
    updates = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.description is not None:
        updates["description"] = data.description.strip()

    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification")

    # Update scenario entity
    result = scenarios_collection.update_one(
        {"_id": ObjectId(scenario_id), "company_id": current_user.get("company_id")},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scénario introuvable")

    # If name changed, update all linked fiscal year names
    if "name" in updates:
        linked_fys = list(fiscal_years_collection.find({
            "scenario_id": scenario_id,
            "type": "scenario"
        }))
        for fy in linked_fys:
            year = fy.get("year", "")
            new_fy_name = f"Scénario {year} — {updates['name']}"
            fiscal_years_collection.update_one(
                {"_id": fy["_id"]},
                {"$set": {"name": new_fy_name, "scenario_name": updates["name"]}}
            )

    updated = scenarios_collection.find_one({"_id": ObjectId(scenario_id)})
    return serialize_doc(updated)


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a scenario and all its linked fiscal years + activities"""
    scenario = scenarios_collection.find_one({
        "_id": ObjectId(scenario_id),
        "company_id": current_user.get("company_id")
    })
    if not scenario:
        raise HTTPException(status_code=404, detail="Scénario introuvable")

    # Find all linked fiscal years
    linked_fys = list(fiscal_years_collection.find({
        "scenario_id": scenario_id,
        "type": "scenario"
    }))

    from config import activities_collection
    deleted_activities = 0
    for fy in linked_fys:
        fy_id = str(fy["_id"])
        res = activities_collection.delete_many({"fiscal_year_id": fy_id})
        deleted_activities += res.deleted_count

    deleted_fys = fiscal_years_collection.delete_many({
        "scenario_id": scenario_id,
        "type": "scenario"
    }).deleted_count

    scenarios_collection.delete_one({"_id": ObjectId(scenario_id)})

    return {
        "message": "Scénario supprimé",
        "deleted_fiscal_years": deleted_fys,
        "deleted_activities": deleted_activities
    }
