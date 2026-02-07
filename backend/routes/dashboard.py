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


def get_default_categories():
    """Get default GHG categories structure"""
    return [
        {"code": "scope1", "name_fr": "Scope 1 - Émissions directes", "name_de": "Scope 1 - Direkte Emissionen", 
         "subcategories": ["combustion_stationnaire", "combustion_mobile", "emissions_process", "emissions_fugitives"]},
        {"code": "scope2", "name_fr": "Scope 2 - Énergie indirecte", "name_de": "Scope 2 - Indirekte Energie",
         "subcategories": ["electricite", "chaleur_vapeur"]},
        {"code": "scope3_amont", "name_fr": "Scope 3 Amont", "name_de": "Scope 3 Upstream",
         "subcategories": ["achats_biens_services", "biens_immobilisations", "energie_amont", "transport_amont", 
                          "dechets", "deplacements_professionnels", "deplacements_domicile_travail", "actifs_loues_amont"]},
        {"code": "scope3_aval", "name_fr": "Scope 3 Aval", "name_de": "Scope 3 Downstream",
         "subcategories": ["transport_aval", "transformation_produits", "utilisation_produits", "fin_vie_produits",
                          "actifs_loues_aval", "franchises", "investissements"]}
    ]


@router.get("/summary")
async def get_dashboard_summary(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard summary with emissions by scope"""
    # Get company info
    company = companies_collection.find_one({"tenant_id": current_user["id"]})
    excluded_categories = company.get("excluded_categories", []) if company else []
    
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
        scope = activity.get("scope", "scope1")
        emissions = activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0
        category = activity.get("category_id", "other")
        
        if scope in scope_emissions:
            scope_emissions[scope] += emissions
        
        if category not in category_emissions:
            category_emissions[category] = 0
        category_emissions[category] += emissions
    
    total_emissions = sum(scope_emissions.values())
    
    # Calculate scope completion
    categories = get_default_categories()
    scope_completion = {}
    
    for cat in categories:
        scope_code = cat["code"]
        subcats = cat["subcategories"]
        total_subcats = len(subcats)
        
        # Count categories with at least one activity
        filled_subcats = 0
        for subcat in subcats:
            if subcat not in excluded_categories:
                has_activity = any(
                    a.get("subcategory_id") == subcat or a.get("category_id") == subcat 
                    for a in activities if a.get("scope") == scope_code
                )
                if has_activity:
                    filled_subcats += 1
        
        # Exclude excluded categories from total
        effective_total = total_subcats - len([s for s in subcats if s in excluded_categories])
        
        scope_completion[scope_code] = {
            "categories_filled": filled_subcats,
            "total_categories": effective_total,
            "percentage": round((filled_subcats / effective_total * 100) if effective_total > 0 else 0)
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
            scope = activity.get("scope", "scope1")
            emissions = activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0
            if scope in scope_emissions:
                scope_emissions[scope] += emissions
        
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
    """Get key performance indicators"""
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
        # Find the most recent fiscal year with activities
        for fy in fiscal_years:
            fy_start = fy.get("start_date", "")
            fy_end = fy.get("end_date", "")
            
            activity_count = activities_collection.count_documents({
                "tenant_id": current_user["id"],
                "date": {"$gte": fy_start, "$lte": fy_end}
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
    
    # Calculate current emissions
    current_emissions = 0
    current_activities_count = 0
    if current_fy:
        start_date = current_fy.get("start_date", "")
        end_date = current_fy.get("end_date", "")
        
        activities = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }))
        current_emissions = sum(a.get("emissions", 0) or 0 for a in activities)
        current_activities_count = len(activities)
    
    # Calculate previous emissions
    previous_emissions = 0
    if previous_fy:
        if previous_fy.get("summary") and previous_fy["summary"].get("total_emissions_tco2e"):
            previous_emissions = previous_fy["summary"].get("total_emissions_tco2e", 0) * 1000
        else:
            start_date = previous_fy.get("start_date", "")
            end_date = previous_fy.get("end_date", "")
            
            activities = list(activities_collection.find({
                "tenant_id": current_user["id"],
                "date": {"$gte": start_date, "$lte": end_date}
            }))
            previous_emissions = sum(a.get("emissions", 0) or 0 for a in activities)
    
    # Calculate KPIs
    variation_percent = 0
    variation_absolute = 0
    if previous_emissions > 0:
        variation_absolute = current_emissions - previous_emissions
        variation_percent = round((variation_absolute / previous_emissions) * 100, 1)
    
    emissions_per_employee = None
    if company and company.get("employees", 0) > 0 and current_emissions > 0:
        emissions_per_employee = current_emissions / company["employees"]
    
    emissions_per_revenue = None
    if company and company.get("revenue", 0) > 0 and current_emissions > 0:
        revenue_kchf = company["revenue"] / 1000
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
        "employees": company.get("employees") if company else None,
        "revenue": company.get("revenue") if company else None
    }
