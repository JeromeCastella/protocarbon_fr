"""
Services de calcul d'émissions
"""
from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime, timezone

from config import (
    emission_factors_collection,
    activities_collection,
    fiscal_years_collection
)


def calculate_emissions_for_activity(
    quantity: float,
    unit: str,
    emission_factor: dict,
    target_scope: str = None
) -> Dict[str, Any]:
    """
    Calcule les émissions pour une activité donnée
    
    Args:
        quantity: Quantité saisie
        unit: Unité de la quantité
        emission_factor: Facteur d'émission (format V2 avec impacts)
        target_scope: Scope cible si on veut filtrer
    
    Returns:
        Dict avec les émissions calculées par scope
    """
    results = {
        "total_emissions": 0,
        "emissions_by_scope": {},
        "emissions_by_impact": []
    }
    
    if not emission_factor:
        return results
    
    # Conversion d'unité si nécessaire
    converted_quantity = quantity
    default_unit = emission_factor.get("default_unit", unit)
    
    if unit != default_unit:
        unit_conversions = emission_factor.get("unit_conversions", {})
        conversion_key = f"{unit}_to_{default_unit}"
        if conversion_key in unit_conversions:
            converted_quantity = quantity * unit_conversions[conversion_key]
    
    # Calculer les émissions pour chaque impact
    impacts = emission_factor.get("impacts", [])
    
    for impact in impacts:
        impact_scope = impact.get("scope", "scope1")
        impact_value = impact.get("value", 0)
        impact_emissions = converted_quantity * impact_value
        
        # Filtrer par scope si demandé
        if target_scope and impact_scope != target_scope:
            continue
        
        results["total_emissions"] += impact_emissions
        
        if impact_scope not in results["emissions_by_scope"]:
            results["emissions_by_scope"][impact_scope] = 0
        results["emissions_by_scope"][impact_scope] += impact_emissions
        
        results["emissions_by_impact"].append({
            "scope": impact_scope,
            "emissions": impact_emissions
        })
    
    return results


def get_factor_valid_for_year(factor_id: str, year: int) -> Optional[dict]:
    """
    Récupère la version du facteur valide pour une année donnée
    
    Args:
        factor_id: ID du facteur
        year: Année de validité recherchée
    
    Returns:
        Le facteur valide ou None
    """
    # Chercher le facteur avec valid_from_year <= year et (valid_to_year >= year ou null)
    factor = emission_factors_collection.find_one({
        "_id": ObjectId(factor_id),
        "deleted_at": None,
        "valid_from_year": {"$lte": year},
        "$or": [
            {"valid_to_year": {"$gte": year}},
            {"valid_to_year": None}
        ]
    })
    
    if not factor:
        # Fallback: chercher la version la plus récente
        factor = emission_factors_collection.find_one({
            "_id": ObjectId(factor_id),
            "deleted_at": None
        })
    
    return factor


def get_emissions_summary_for_fiscal_year(
    tenant_id: str,
    fiscal_year_id: str
) -> Dict[str, Any]:
    """
    Calcule le résumé des émissions pour un exercice fiscal
    
    Args:
        tenant_id: ID du tenant
        fiscal_year_id: ID de l'exercice fiscal
    
    Returns:
        Dict avec le résumé des émissions
    """
    # Récupérer l'exercice fiscal
    fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    if not fy:
        return {"error": "Fiscal year not found"}
    
    start_date = fy.get("start_date", "")
    end_date = fy.get("end_date", "")
    
    # Récupérer les activités
    activities = list(activities_collection.find({
        "tenant_id": tenant_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }))
    
    # Agréger par scope
    scope_totals = {
        "scope1": 0,
        "scope2": 0,
        "scope3_amont": 0,
        "scope3_aval": 0
    }
    
    for activity in activities:
        scope = activity.get("scope", "scope1")
        emissions = activity.get("emissions", 0) or 0
        if scope in scope_totals:
            scope_totals[scope] += emissions
    
    total = sum(scope_totals.values())
    
    return {
        "fiscal_year_id": fiscal_year_id,
        "fiscal_year_name": fy.get("name", ""),
        "total_emissions": total,
        "scope_emissions": scope_totals,
        "activities_count": len(activities)
    }


def create_factor_snapshot(factor: dict) -> dict:
    """
    Crée un snapshot d'un facteur d'émission
    
    Args:
        factor: Le facteur d'émission
    
    Returns:
        Un snapshot figé du facteur
    """
    return {
        "factor_id": str(factor.get("_id", "")),
        "factor_version": factor.get("version", 1),
        "name_simple_fr": factor.get("name_simple_fr", ""),
        "name_simple_de": factor.get("name_simple_de", ""),
        "name_fr": factor.get("name_fr", factor.get("name", "")),
        "name_de": factor.get("name_de", ""),
        "subcategory": factor.get("subcategory", ""),
        "impacts": factor.get("impacts", []),
        "source": factor.get("source", ""),
        "year": factor.get("year", datetime.now().year),
        "valid_from_year": factor.get("valid_from_year"),
        "captured_at": datetime.now(timezone.utc).isoformat()
    }
