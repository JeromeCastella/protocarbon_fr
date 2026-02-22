"""
Routes pour le dashboard
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import (
    activities_collection,
    products_collection,
    fiscal_years_collection,
    companies_collection,
    categories_collection
)
from services.auth import get_current_user
from utils import serialize_doc

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_fiscal_year_context_with_fallback(fiscal_year_id: str, tenant_id: str):
    """
    Helper function to get context from fiscal year with fallback to company.
    Returns: dict with employees, revenue, surface_area, excluded_categories
    """
    company = companies_collection.find_one({"tenant_id": tenant_id})
    
    if fiscal_year_id:
        try:
            fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
            if fy:
                fy_context = fy.get("context", {})
                return {
                    "employees": fy_context.get("employees") if fy_context.get("employees") is not None else (company.get("employees") if company else None),
                    "revenue": fy_context.get("revenue") if fy_context.get("revenue") is not None else (company.get("revenue") if company else None),
                    "surface_area": fy_context.get("surface_area") if fy_context.get("surface_area") is not None else (company.get("surface_area") if company else None),
                    "excluded_categories": fy_context.get("excluded_categories") if fy_context.get("excluded_categories") is not None else (company.get("excluded_categories", []) if company else [])
                }
        except:
            pass
    
    # Fallback to company only
    if company:
        return {
            "employees": company.get("employees"),
            "revenue": company.get("revenue"),
            "surface_area": company.get("surface_area"),
            "excluded_categories": company.get("excluded_categories", [])
        }
    
    return {
        "employees": None,
        "revenue": None,
        "surface_area": None,
        "excluded_categories": []
    }





# Catégories Scope 3 Amont (pour le mapping de scope3 générique)
SCOPE3_AMONT_CATEGORIES = {
    'biens_services_achetes', 'biens_equipement', 'activites_combustibles_energie',
    'transport_distribution_amont', 'dechets_operations', 'deplacements_professionnels',
    'deplacements_domicile_travail', 'actifs_loues_amont'
}

# Catégories Scope 3 Aval
SCOPE3_AVAL_CATEGORIES = {
    'transport_distribution_aval', 'transformation_produits', 'utilisation_produits',
    'fin_vie_produits', 'actifs_loues_aval', 'franchises', 'investissements'
}


def normalize_scope_for_reporting(scope: str, category_id: str = None) -> str:
    """
    Normalise les scopes granulaires vers les scopes de reporting (scope1, scope2, scope3_amont, scope3_aval).
    
    Règles de mapping :
    - scope1 → scope1
    - scope2 → scope2
    - scope3_3 → scope3_amont (car 3.3 = amont énergie, toujours amont)
    - scope3 → scope3_amont ou scope3_aval selon la catégorie
    - scope3_amont → scope3_amont
    - scope3_aval → scope3_aval
    """
    if not scope:
        return 'scope1'
    
    scope_lower = scope.lower().strip()
    
    # Scopes directs - pas de changement
    if scope_lower in ['scope1', 'scope2', 'scope3_amont', 'scope3_aval']:
        return scope_lower
    
    # Scope 3.3 (amont énergie) → toujours scope3_amont
    if scope_lower == 'scope3_3':
        return 'scope3_amont'
    
    # Scope 3 générique → déterminer selon la catégorie
    if scope_lower == 'scope3':
        if category_id:
            if category_id in SCOPE3_AMONT_CATEGORIES:
                return 'scope3_amont'
            elif category_id in SCOPE3_AVAL_CATEGORIES:
                return 'scope3_aval'
        # Par défaut, scope3 va dans amont (plus conservateur)
        return 'scope3_amont'
    
    # Fallback pour tout autre cas
    return 'scope1'


@router.get("/summary")
async def get_dashboard_summary(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard summary with emissions by scope"""
    # Get context (from fiscal year or company fallback)
    context = get_fiscal_year_context_with_fallback(fiscal_year_id, current_user["id"])
    excluded_categories = context.get("excluded_categories", [])
    
    # Build query - filter by fiscal year if specified using fiscal_year_id
    query = {"tenant_id": current_user["id"]}
    
    if fiscal_year_id:
        # Use fiscal_year_id directly for correct filtering
        query["fiscal_year_id"] = fiscal_year_id
    
    # Get activities (filtered by fiscal year if specified)
    activities = list(activities_collection.find(query))
    
    # Calculate emissions by scope
    scope_emissions = {
        "scope1": 0,
        "scope2": 0,
        "scope3_amont": 0,
        "scope3_aval": 0
    }
    
    category_emissions = {}
    
    for activity in activities:
        raw_scope = activity.get("scope", "scope1")
        category = activity.get("category_id", "other")
        emissions = activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0
        
        # Normaliser le scope pour le reporting (scope3_3 → scope3_amont, etc.)
        normalized_scope = normalize_scope_for_reporting(raw_scope, category)
        
        if normalized_scope in scope_emissions:
            scope_emissions[normalized_scope] += emissions
        
        if category not in category_emissions:
            category_emissions[category] = 0
        category_emissions[category] += emissions
    
    total_emissions = sum(scope_emissions.values())
    
    # Calculate scope completion
    # Use real categories from DB (same source as frontend), not the hardcoded list
    real_categories = list(categories_collection.find({}))
    scope_completion = {}

    for scope_code in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
        # Only keep categories that belong to this scope and are not excluded
        open_cats = [
            c for c in real_categories
            if c.get("scope") == scope_code
            and c.get("code") not in excluded_categories
        ]
        effective_total = len(open_cats)

        # Count how many of those categories have at least one activity
        filled = 0
        for cat in open_cats:
            has_activity = any(
                normalize_scope_for_reporting(a.get("scope", ""), a.get("category_id", "")) == scope_code
                and a.get("category_id") == cat["code"]
                for a in activities
            )
            if has_activity:
                filled += 1

        scope_completion[scope_code] = {
            "categories_filled": filled,
            "total_categories": effective_total,
            "percentage": round((filled / effective_total * 100) if effective_total > 0 else 0)
        }
    
    # Count products
    products_count = products_collection.count_documents({"tenant_id": current_user["id"]})
    
    return {
        "total_emissions": total_emissions,
        "scope_emissions": scope_emissions,
        "category_emissions": category_emissions,
        "scope_completion": scope_completion,
        "activities_count": len(activities),
        "products_count": products_count,
        "excluded_categories": excluded_categories
    }


@router.get("/category-stats")
async def get_category_stats(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics by category"""
    # Build query - filter by fiscal year if specified using fiscal_year_id
    query = {"tenant_id": current_user["id"]}
    
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    
    activities = list(activities_collection.find(query))
    
    stats = {}
    for activity in activities:
        category = activity.get("category_id", "other")
        if category not in stats:
            stats[category] = {"count": 0, "emissions": 0}
        stats[category]["count"] += 1
        stats[category]["emissions"] += activity.get("emissions", 0) or 0
    
    return stats


@router.get("/fiscal-comparison")
async def get_fiscal_comparison(current_user: dict = Depends(get_current_user)):
    """Get emissions comparison across fiscal years"""
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"]
    }).sort("start_date", 1))
    
    comparison = []
    
    for fy in fiscal_years:
        fy_id = str(fy["_id"])
        fy_start = fy.get("start_date", "")
        fy_end = fy.get("end_date", "")
        
        # Get activities for this fiscal year by fiscal_year_id (primary method)
        # This correctly associates activities with their assigned fiscal year
        query = {
            "tenant_id": current_user["id"],
            "fiscal_year_id": fy_id
        }
        
        activities = list(activities_collection.find(query))
        
        scope_emissions = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
        
        for activity in activities:
            raw_scope = activity.get("scope", "scope1")
            category = activity.get("category_id", "other")
            emissions = activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0
            
            # Normaliser le scope pour le reporting (scope3_3 → scope3_amont, etc.)
            normalized_scope = normalize_scope_for_reporting(raw_scope, category)
            
            if normalized_scope in scope_emissions:
                scope_emissions[normalized_scope] += emissions
        
        total = sum(scope_emissions.values())
        
        # Extract year from name for chart display (e.g., "Exercice 2026" -> "2026")
        year_label = fy.get("name", "").replace("Exercice ", "")
        
        comparison.append({
            "fiscal_year_id": fy_id,
            "name": fy.get("name", ""),
            "year": year_label,  # For chart X-axis
            "status": fy.get("status", "draft"),
            "start_date": fy_start,
            "end_date": fy_end,
            "total_emissions": total,
            # Flat scope emissions for direct chart usage
            "scope1": scope_emissions["scope1"],
            "scope2": scope_emissions["scope2"],
            "scope3_amont": scope_emissions["scope3_amont"],
            "scope3_aval": scope_emissions["scope3_aval"],
            "scope_emissions": scope_emissions,  # Keep nested for backward compatibility
            "activities_count": len(activities)
        })
    
    return comparison


@router.get("/scope-breakdown/{fiscal_year_id}")
async def get_scope_breakdown(fiscal_year_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed breakdown by scope for a fiscal year"""
    if fiscal_year_id == "current":
        fy = fiscal_years_collection.find_one({
            "tenant_id": current_user["id"],
            "status": "draft"
        }, sort=[("start_date", -1)])
    else:
        fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    
    if not fy:
        return {"scopes": {}, "total": 0}
    
    fy_id = str(fy["_id"])
    
    # Use fiscal_year_id for correct filtering
    query = {
        "tenant_id": current_user["id"],
        "fiscal_year_id": fy_id
    }
    
    activities = list(activities_collection.find(query))
    
    scopes = {
        "scope1": {"total": 0, "categories": {}},
        "scope2": {"total": 0, "categories": {}},
        "scope3_amont": {"total": 0, "categories": {}},
        "scope3_aval": {"total": 0, "categories": {}}
    }
    
    for activity in activities:
        scope = activity.get("scope", "scope1")
        category = activity.get("category_id", "other")
        emissions = activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0
        
        if scope in scopes:
            scopes[scope]["total"] += emissions
            if category not in scopes[scope]["categories"]:
                scopes[scope]["categories"][category] = 0
            scopes[scope]["categories"][category] += emissions
    
    total = sum(s["total"] for s in scopes.values())
    
    return {
        "fiscal_year": serialize_doc(fy),
        "scopes": scopes,
        "total": total
    }


@router.get("/kpis")
async def get_dashboard_kpis(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get key performance indicators using fiscal year context"""
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"]
    }).sort("start_date", -1))
    
    # Determine current fiscal year
    current_fy = None
    previous_fy = None
    
    if fiscal_year_id and fiscal_year_id != 'current':
        current_fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
        if current_fy:
            current_start = current_fy.get("start_date", "")
            for fy in fiscal_years:
                if fy.get("start_date", "") < current_start:
                    previous_fy = fy
                    break
    else:
        # Find the most recent fiscal year with activities using fiscal_year_id
        for fy in fiscal_years:
            fy_id = str(fy["_id"])
            
            activity_count = activities_collection.count_documents({
                "tenant_id": current_user["id"],
                "fiscal_year_id": fy_id
            })
            
            if activity_count > 0:
                if not current_fy:
                    current_fy = fy
                elif current_fy:
                    previous_fy = fy
                    break
        
        if not current_fy:
            for fy in fiscal_years:
                if fy.get("status") == "draft":
                    current_fy = fy
                    break
    
    # Get context from current fiscal year (with fallback to company)
    current_fy_id = str(current_fy["_id"]) if current_fy else None
    context = get_fiscal_year_context_with_fallback(current_fy_id, current_user["id"])
    
    # Calculate current emissions using fiscal_year_id
    current_emissions = 0
    current_activities_count = 0
    if current_fy:
        activities = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "fiscal_year_id": current_fy_id
        }))
        current_emissions = sum(a.get("emissions", 0) or 0 for a in activities)
        current_activities_count = len(activities)
    
    # Calculate previous emissions using fiscal_year_id
    previous_emissions = 0
    if previous_fy:
        if previous_fy.get("summary") and previous_fy["summary"].get("total_emissions_tco2e"):
            previous_emissions = previous_fy["summary"].get("total_emissions_tco2e", 0) * 1000
        else:
            previous_fy_id = str(previous_fy["_id"])
            
            activities = list(activities_collection.find({
                "tenant_id": current_user["id"],
                "fiscal_year_id": previous_fy_id
            }))
            previous_emissions = sum(a.get("emissions", 0) or 0 for a in activities)
    
    # Calculate KPIs using fiscal year context
    variation_percent = 0
    variation_absolute = 0
    if previous_emissions > 0:
        variation_absolute = current_emissions - previous_emissions
        variation_percent = round((variation_absolute / previous_emissions) * 100, 1)
    
    # Use context employees/revenue instead of company values
    context_employees = context.get("employees") or 0
    context_revenue = context.get("revenue") or 0
    
    emissions_per_employee = None
    if context_employees > 0 and current_emissions > 0:
        emissions_per_employee = current_emissions / context_employees
    
    emissions_per_revenue = None
    if context_revenue > 0 and current_emissions > 0:
        revenue_kchf = context_revenue / 1000
        emissions_per_revenue = current_emissions / revenue_kchf if revenue_kchf > 0 else None
    
    products_count = products_collection.count_documents({"tenant_id": current_user["id"]})
    
    year_over_year_change = None
    if previous_emissions > 0 and current_emissions > 0:
        year_over_year_change = round(((current_emissions - previous_emissions) / previous_emissions) * 100, 1)
    
    return {
        "current_emissions": round(current_emissions, 2),
        "previous_emissions": round(previous_emissions, 2),
        "variation_percent": variation_percent,
        "variation_absolute": round(variation_absolute, 2),
        "activities_count": current_activities_count,
        "products_count": products_count,
        "emissions_per_employee": round(emissions_per_employee, 2) if emissions_per_employee else None,
        "emissions_per_revenue": round(emissions_per_revenue, 2) if emissions_per_revenue else None,
        "year_over_year_change": year_over_year_change,
        "fiscal_years_count": len(fiscal_years),
        "current_fiscal_year": current_fy.get("name") if current_fy else None,
        "previous_fiscal_year": previous_fy.get("name") if previous_fy else None,
        # Return context values (from fiscal year or fallback)
        "employees": context_employees if context_employees > 0 else None,
        "revenue": context_revenue if context_revenue > 0 else None,
        "surface_area": context.get("surface_area")
    }
