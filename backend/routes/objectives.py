"""
Routes pour les objectifs carbone
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import (
    carbon_objectives_collection,
    fiscal_years_collection,
    activities_collection
)
from models import CarbonObjectiveCreate, CarbonObjectiveUpdate
from services.auth import get_current_user
from utils import serialize_doc
from services.scope_mapping import normalize_scope_for_reporting

router = APIRouter(prefix="/objectives", tags=["Objectives"])

# SBTi Configuration
SBTI_TARGETS = {
    2030: {
        "reduction_scope1_2_percent": 42,
        "reduction_scope3_percent": 25,
        "label": "Near-term 2030"
    },
    2035: {
        "reduction_scope1_2_percent": 65,
        "reduction_scope3_percent": 39,
        "label": "Near-term 2035"
    }
}

# Recommended measures by category
RECOMMENDED_MEASURES = {
    "combustion_mobile": [
        {"title_fr": "Électrifier la flotte de véhicules", "title_de": "Fahrzeugflotte elektrifizieren", "impact": "high"},
        {"title_fr": "Mettre en place le covoiturage", "title_de": "Fahrgemeinschaften einrichten", "impact": "medium"},
        {"title_fr": "Favoriser le télétravail", "title_de": "Homeoffice fördern", "impact": "medium"}
    ],
    "electricite": [
        {"title_fr": "Passer à l'électricité 100% renouvelable", "title_de": "Auf 100% erneuerbare Energie umsteigen", "impact": "high"},
        {"title_fr": "Optimiser l'éclairage (LED)", "title_de": "Beleuchtung optimieren (LED)", "impact": "medium"},
        {"title_fr": "Installer des panneaux solaires", "title_de": "Solaranlagen installieren", "impact": "high"}
    ],
    "combustion_stationnaire": [
        {"title_fr": "Remplacer le chauffage fossile par PAC", "title_de": "Fossile Heizung durch Wärmepumpe ersetzen", "impact": "high"},
        {"title_fr": "Améliorer l'isolation des bâtiments", "title_de": "Gebäudedämmung verbessern", "impact": "high"},
        {"title_fr": "Optimiser la régulation thermique", "title_de": "Wärmeregulierung optimieren", "impact": "medium"}
    ],
    "utilisation_produits": [
        {"title_fr": "Améliorer l'efficacité énergétique des produits", "title_de": "Energieeffizienz der Produkte verbessern", "impact": "high"},
        {"title_fr": "Proposer des modes d'utilisation bas-carbone", "title_de": "CO2-arme Nutzungsmodi anbieten", "impact": "medium"},
        {"title_fr": "Sensibiliser les clients à l'usage responsable", "title_de": "Kunden für verantwortungsvolle Nutzung sensibilisieren", "impact": "medium"}
    ],
    "fin_vie_produits": [
        {"title_fr": "Concevoir pour la recyclabilité", "title_de": "Für Recyclingfähigkeit konzipieren", "impact": "high"},
        {"title_fr": "Mettre en place un programme de reprise", "title_de": "Rücknahmeprogramm einrichten", "impact": "high"},
        {"title_fr": "Utiliser des matériaux recyclés", "title_de": "Recycelte Materialien verwenden", "impact": "medium"}
    ],
    "biens_services_achetes": [
        {"title_fr": "Achats responsables (labels éco)", "title_de": "Verantwortungsvoller Einkauf (Öko-Labels)", "impact": "medium"},
        {"title_fr": "Réduire les achats de matériel neuf", "title_de": "Neuanschaffungen reduzieren", "impact": "medium"},
        {"title_fr": "Favoriser les fournisseurs locaux", "title_de": "Lokale Lieferanten bevorzugen", "impact": "medium"}
    ]
}


@router.get("")
async def get_carbon_objective(current_user: dict = Depends(get_current_user)):
    """Get active carbon objective for the user's company"""
    if not current_user.get("company_id"):
        return None
    
    objective = carbon_objectives_collection.find_one({
        "company_id": current_user["company_id"],
        "status": "active"
    })
    
    if not objective:
        return None
    
    return serialize_doc(objective)


@router.post("")
async def create_carbon_objective(
    objective_data: CarbonObjectiveCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new carbon objective with SBTi trajectory"""
    if not current_user.get("company_id"):
        raise HTTPException(status_code=400, detail="User must be associated with a company")
    
    if objective_data.target_year not in SBTI_TARGETS:
        raise HTTPException(status_code=400, detail="Target year must be 2030 or 2035")
    
    # Archive existing active objectives
    carbon_objectives_collection.update_many(
        {"company_id": current_user["company_id"], "status": "active"},
        {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get reference fiscal year
    ref_fy = fiscal_years_collection.find_one({"_id": ObjectId(objective_data.reference_fiscal_year_id)})
    if not ref_fy:
        raise HTTPException(status_code=404, detail="Reference fiscal year not found")
    
    # Calculate baseline
    ref_start = ref_fy.get("start_date", "")
    ref_end = ref_fy.get("end_date", "")
    reference_year = int(ref_start[:4]) if ref_start else datetime.now().year
    
    activities = list(activities_collection.find({
        "company_id": current_user["company_id"],
        "date": {"$gte": ref_start, "$lte": ref_end}
    }))
    
    baseline_scope1 = 0
    baseline_scope2 = 0
    baseline_scope3 = 0
    baseline_by_category = {}
    
    for act in activities:
        emissions = act.get("emissions", 0) or act.get("calculated_emissions", 0) or 0
        scope = act.get("scope", "")
        category = act.get("category_id", "other")
        
        if category not in baseline_by_category:
            baseline_by_category[category] = 0
        baseline_by_category[category] += emissions
        
        if scope == "scope1":
            baseline_scope1 += emissions
        elif scope == "scope2":
            baseline_scope2 += emissions
        elif scope in ["scope3_amont", "scope3_aval"]:
            baseline_scope3 += emissions
    
    baseline_scope1_2 = baseline_scope1 + baseline_scope2
    
    # Get SBTi targets
    sbti_config = SBTI_TARGETS[objective_data.target_year]
    reduction_scope1_2 = sbti_config["reduction_scope1_2_percent"]
    reduction_scope3 = sbti_config["reduction_scope3_percent"]
    
    # Calculate target values
    target_scope1_2 = baseline_scope1_2 * (1 - reduction_scope1_2 / 100)
    target_scope3 = baseline_scope3 * (1 - reduction_scope3 / 100)
    
    objective_doc = {
        "company_id": current_user["company_id"],
        "reference_year": reference_year,
        "reference_fiscal_year_id": objective_data.reference_fiscal_year_id,
        "baseline_scope1": baseline_scope1,
        "baseline_scope2": baseline_scope2,
        "baseline_scope1_2": baseline_scope1_2,
        "baseline_scope3": baseline_scope3,
        "baseline_total": baseline_scope1_2 + baseline_scope3,
        "baseline_by_category": baseline_by_category,
        "target_year": objective_data.target_year,
        "target_type": "sbti_near_term",
        "target_label": sbti_config["label"],
        "reduction_scope1_2_percent": reduction_scope1_2,
        "reduction_scope3_percent": reduction_scope3,
        "target_scope1_2": target_scope1_2,
        "target_scope3": target_scope3,
        "target_total": target_scope1_2 + target_scope3,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    result = carbon_objectives_collection.insert_one(objective_doc)
    objective_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(objective_doc)


@router.get("/trajectory")
async def get_objective_trajectory(current_user: dict = Depends(get_current_user)):
    """Get trajectory data for charts"""
    if not current_user.get("company_id"):
        return {"trajectory": [], "actuals": []}
    
    objective = carbon_objectives_collection.find_one({
        "company_id": current_user["company_id"],
        "status": "active"
    })
    
    if not objective:
        return {"trajectory": [], "actuals": [], "objective": None}
    
    reference_year = objective.get("reference_year", 2024)
    target_year = objective.get("target_year", 2030)
    baseline_scope1_2 = objective.get("baseline_scope1_2", 0)
    baseline_scope3 = objective.get("baseline_scope3", 0)
    target_scope1_2 = objective.get("target_scope1_2", 0)
    target_scope3 = objective.get("target_scope3", 0)
    
    # Generate trajectory points
    trajectory = []
    years_span = target_year - reference_year
    
    for year in range(reference_year, target_year + 1):
        progress = (year - reference_year) / years_span if years_span > 0 else 0
        target_s12_year = baseline_scope1_2 - (baseline_scope1_2 - target_scope1_2) * progress
        target_s3_year = baseline_scope3 - (baseline_scope3 - target_scope3) * progress
        
        trajectory.append({
            "year": year,
            "target_scope1_2": round(target_s12_year, 2),
            "target_scope3": round(target_s3_year, 2),
            "target_total": round(target_s12_year + target_s3_year, 2)
        })
    
    # Get actual emissions by fiscal year (exclude scenarios)
    fiscal_years = list(fiscal_years_collection.find({
        "company_id": current_user["company_id"],
        "type": {"$ne": "scenario"}
    }).sort("start_date", 1))
    
    actuals = []
    for fy in fiscal_years:
        fy_start = fy.get("start_date", "")
        fy_year = int(fy_start[:4]) if fy_start else 0
        
        if fy_year < reference_year or fy_year > target_year:
            continue
        
        activities = list(activities_collection.find({
            "company_id": current_user["company_id"],
            "fiscal_year_id": str(fy["_id"])
        }))
        
        actual_scope1 = 0
        actual_scope2 = 0
        actual_scope3 = 0
        
        for act in activities:
            emissions = act.get("emissions", 0) or act.get("calculated_emissions", 0) or 0
            raw_scope = act.get("scope", "")
            category_id = act.get("category_id", "")
            scope = normalize_scope_for_reporting(raw_scope, category_id)
            
            if scope == "scope1":
                actual_scope1 += emissions
            elif scope == "scope2":
                actual_scope2 += emissions
            elif scope in ["scope3_amont", "scope3_aval"]:
                actual_scope3 += emissions
        
        actuals.append({
            "year": fy_year,
            "fiscal_year_id": str(fy["_id"]),
            "fiscal_year_name": fy.get("name", ""),
            "actual_scope1": round(actual_scope1, 2),
            "actual_scope2": round(actual_scope2, 2),
            "actual_scope3": round(actual_scope3, 2),
            "actual_total": round(actual_scope1 + actual_scope2 + actual_scope3, 2)
        })
    
    return {
        "trajectory": trajectory,
        "actuals": actuals,
        "objective": serialize_doc(objective)
    }


@router.get("/recommendations")
async def get_objective_recommendations(current_user: dict = Depends(get_current_user)):
    """Get recommended measures based on top emission categories"""
    if not current_user.get("company_id"):
        return {"recommendations": []}
    
    objective = carbon_objectives_collection.find_one({
        "company_id": current_user["company_id"],
        "status": "active"
    })
    
    if not objective:
        return {"recommendations": []}
    
    baseline_by_category = objective.get("baseline_by_category", {})
    sorted_categories = sorted(baseline_by_category.items(), key=lambda x: x[1], reverse=True)
    
    recommendations = []
    for category, emissions in sorted_categories[:3]:
        if category in RECOMMENDED_MEASURES:
            recommendations.append({
                "category": category,
                "emissions": emissions,
                "measures": RECOMMENDED_MEASURES[category]
            })
    
    return {"recommendations": recommendations}


@router.delete("/{objective_id}")
async def archive_carbon_objective(
    objective_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Archive a carbon objective"""
    result = carbon_objectives_collection.update_one(
        {
            "_id": ObjectId(objective_id),
            "company_id": current_user["company_id"]
        },
        {
            "$set": {
                "status": "archived",
                "archived_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Objective not found")
    
    return {"message": "Objective archived successfully"}
