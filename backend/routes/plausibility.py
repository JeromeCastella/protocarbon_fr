"""
Route pour le test de plausibilité
"""
from fastapi import APIRouter, Depends
from typing import Optional

import sys
sys.path.append('/app/backend')

from config import (
    activities_collection,
    companies_collection,
    fiscal_years_collection,
    categories_collection,
)
from services.auth import get_current_user
from services.scope_mapping import normalize_scope_for_reporting
from services.plausibility import run_all_checks

router = APIRouter(prefix="/plausibility", tags=["Plausibility"])


@router.post("/check")
async def run_plausibility_check(
    fiscal_year_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Run plausibility checks on the current fiscal year data."""
    tenant_id = current_user["id"]

    # ── Resolve fiscal year ───────────────────────────────────────────────
    fy_query = {"tenant_id": tenant_id}
    if fiscal_year_id:
        from bson import ObjectId
        fy = fiscal_years_collection.find_one({"_id": ObjectId(fiscal_year_id)})
    else:
        fy = fiscal_years_collection.find_one(
            {**fy_query, "status": "draft"}, sort=[("start_date", -1)]
        )
    fy_id = str(fy["_id"]) if fy else None
    fy_context = (fy or {}).get("context", {})

    # ── Company info ──────────────────────────────────────────────────────
    company = companies_collection.find_one({"tenant_id": tenant_id}) or {}
    employees = fy_context.get("employees") or company.get("employees") or 0
    surface_area = fy_context.get("surface_area") or company.get("surface_area") or 0
    revenue = fy_context.get("revenue") or company.get("revenue") or 0
    sector = company.get("sector", "other")
    excluded_categories = (
        fy_context.get("excluded_categories")
        if fy_context.get("excluded_categories") is not None
        else company.get("excluded_categories", [])
    )

    # ── Activities ────────────────────────────────────────────────────────
    act_query = {"tenant_id": tenant_id}
    if fy_id:
        act_query["fiscal_year_id"] = fy_id
    activities = list(activities_collection.find(act_query, {"_id": 0}))

    # Compute scope emissions & group activities by scope
    scope_emissions = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
    activities_by_scope = {"scope1": [], "scope2": [], "scope3_amont": [], "scope3_aval": []}
    filled_categories = set()

    for act in activities:
        raw_scope = act.get("scope", "scope1")
        cat = act.get("category_id", "other")
        emissions = act.get("emissions", 0) or act.get("calculated_emissions", 0) or 0
        norm_scope = normalize_scope_for_reporting(raw_scope, cat)

        if norm_scope in scope_emissions:
            scope_emissions[norm_scope] += emissions
        if norm_scope in activities_by_scope:
            activities_by_scope[norm_scope].append(act)
        if cat:
            filled_categories.add(cat)

    total_emissions = sum(scope_emissions.values())

    # ── Categories info ───────────────────────────────────────────────────
    all_cats = list(categories_collection.find({}, {"_id": 0, "code": 1}))
    available_cats = [c["code"] for c in all_cats if c["code"] not in (excluded_categories or [])]

    # ── Build context dict ────────────────────────────────────────────────
    ctx = {
        "employees": employees,
        "surface_area": surface_area,
        "revenue": revenue,
        "sector": sector,
        "excluded_categories": excluded_categories or [],
        "total_emissions": total_emissions,
        "scope_emissions": scope_emissions,
        "activities_count": len(activities),
        "activities_by_scope": activities_by_scope,
        "filled_categories": filled_categories,
        "total_categories": len(available_cats),
    }

    # ── Run rules ─────────────────────────────────────────────────────────
    alerts = run_all_checks(ctx)

    return {
        "alerts": alerts,
        "summary": {
            "total_alerts": len(alerts),
            "critical": sum(1 for a in alerts if a["severity"] == "critical"),
            "warning": sum(1 for a in alerts if a["severity"] == "warning"),
            "info": sum(1 for a in alerts if a["severity"] == "info"),
        },
        "context_used": {
            "fiscal_year": fy.get("name") if fy else None,
            "sector": sector,
            "employees": employees,
            "surface_area": surface_area,
            "revenue": revenue,
            "activities_count": len(activities),
            "total_emissions": round(total_emissions, 2),
        },
    }
