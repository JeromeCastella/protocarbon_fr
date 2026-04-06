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
from services.dashboard_service import (
    get_activity_emissions,
    calculate_scope_emissions,
    calculate_category_emissions,
    calculate_scope_completion,
    resolve_current_and_previous_fy,
    calculate_kpi_metrics,
    get_fiscal_year_context_with_fallback,
    fetch_fy_emissions,
)
from utils import serialize_doc

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    fiscal_year_id: Optional[str] = None,
    reporting_view: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get dashboard summary with emissions by scope."""
    context = get_fiscal_year_context_with_fallback(fiscal_year_id, current_user["id"])
    excluded_categories = context.get("excluded_categories", [])

    query = {"tenant_id": current_user["id"]}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id

    activities = list(activities_collection.find(query))
    has_market_based = any(a.get("reporting_method") == "market" for a in activities)

    scope_emissions = calculate_scope_emissions(activities, reporting_view)
    category_emissions = calculate_category_emissions(activities, reporting_view)
    total_emissions = sum(scope_emissions.values())

    real_categories = list(categories_collection.find({}))
    scope_completion = calculate_scope_completion(activities, real_categories, excluded_categories)

    products_count = products_collection.count_documents({"tenant_id": current_user["id"]})

    return {
        "total_emissions": total_emissions,
        "scope_emissions": scope_emissions,
        "category_emissions": category_emissions,
        "scope_completion": scope_completion,
        "activities_count": len(activities),
        "products_count": products_count,
        "excluded_categories": excluded_categories,
        "has_market_based": has_market_based,
        "reporting_view": reporting_view or "market",
    }


@router.get("/category-stats")
async def get_category_stats(
    fiscal_year_id: Optional[str] = None,
    reporting_view: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get emissions per category for a fiscal year."""
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
        stats[category]["emissions"] += get_activity_emissions(activity, reporting_view)

    return stats


@router.get("/fiscal-comparison")
async def get_fiscal_comparison(
    reporting_view: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get emissions comparison across fiscal years (actual only, excludes scenarios)."""
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"],
        "type": {"$ne": "scenario"},
    }).sort("start_date", 1))

    comparison = []
    for fy in fiscal_years:
        fy_id = str(fy["_id"])

        activities = list(activities_collection.find({
            "tenant_id": current_user["id"],
            "fiscal_year_id": fy_id,
        }))

        scope_emissions = calculate_scope_emissions(activities, reporting_view)
        total = sum(scope_emissions.values())
        year_label = fy.get("name", "").replace("Exercice ", "")

        comparison.append({
            "fiscal_year_id": fy_id,
            "name": fy.get("name", ""),
            "year": year_label,
            "status": fy.get("status", "draft"),
            "start_date": fy.get("start_date", ""),
            "end_date": fy.get("end_date", ""),
            "total_emissions": total,
            "scope1": scope_emissions["scope1"],
            "scope2": scope_emissions["scope2"],
            "scope3_amont": scope_emissions["scope3_amont"],
            "scope3_aval": scope_emissions["scope3_aval"],
            "scope_emissions": scope_emissions,
            "activities_count": len(activities),
        })

    return comparison


@router.get("/scope-breakdown/{fiscal_year_id}")
async def get_scope_breakdown(
    fiscal_year_id: str,
    reporting_view: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get detailed breakdown by scope for a fiscal year."""
    if fiscal_year_id == "current":
        fy = fiscal_years_collection.find_one(
            {"tenant_id": current_user["id"], "status": "draft"},
            sort=[("start_date", -1)],
        )
    else:
        fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})

    if not fy:
        return {"scopes": {}, "total": 0}

    fy_id = str(fy["_id"])
    activities = list(activities_collection.find({
        "tenant_id": current_user["id"],
        "fiscal_year_id": fy_id,
    }))

    scopes = {
        "scope1": {"total": 0, "categories": {}},
        "scope2": {"total": 0, "categories": {}},
        "scope3_amont": {"total": 0, "categories": {}},
        "scope3_aval": {"total": 0, "categories": {}},
    }

    for activity in activities:
        scope = activity.get("scope", "scope1")
        category = activity.get("category_id", "other")
        emissions = get_activity_emissions(activity, reporting_view)

        if scope in scopes:
            scopes[scope]["total"] += emissions
            scopes[scope]["categories"][category] = scopes[scope]["categories"].get(category, 0) + emissions

    total = sum(s["total"] for s in scopes.values())

    return {
        "fiscal_year": serialize_doc(fy),
        "scopes": scopes,
        "total": total,
    }


@router.get("/kpis")
async def get_dashboard_kpis(
    fiscal_year_id: Optional[str] = None,
    reporting_view: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get key performance indicators using fiscal year context."""
    fiscal_years = list(fiscal_years_collection.find({
        "tenant_id": current_user["id"],
    }).sort("start_date", -1))

    current_fy, previous_fy = resolve_current_and_previous_fy(
        fiscal_years, fiscal_year_id, current_user["id"], activities_collection,
    )

    current_fy_id = str(current_fy["_id"]) if current_fy else None
    context = get_fiscal_year_context_with_fallback(current_fy_id, current_user["id"])

    current_emissions, current_activities_count = fetch_fy_emissions(
        current_user["id"], current_fy, reporting_view,
    )

    # Previous emissions: prefer cached summary when available
    previous_emissions = 0
    if previous_fy:
        cached = (not reporting_view and previous_fy.get("summary", {}).get("total_emissions_tco2e"))
        if cached:
            previous_emissions = cached * 1000
        else:
            previous_emissions, _ = fetch_fy_emissions(current_user["id"], previous_fy, reporting_view)

    metrics = calculate_kpi_metrics(current_emissions, previous_emissions, context)

    return {
        "current_emissions": round(current_emissions, 2),
        "previous_emissions": round(previous_emissions, 2),
        **metrics,
        "activities_count": current_activities_count,
        "products_count": products_collection.count_documents({"tenant_id": current_user["id"]}),
        "fiscal_years_count": len(fiscal_years),
        "current_fiscal_year": current_fy.get("name") if current_fy else None,
        "previous_fiscal_year": previous_fy.get("name") if previous_fy else None,
        "employees": (context.get("employees") or 0) or None,
        "revenue": (context.get("revenue") or 0) or None,
        "surface_area": context.get("surface_area"),
    }
