"""
Service métier pour le dashboard — helpers extraits de routes/dashboard.py
"""
from bson import ObjectId
from services.scope_mapping import normalize_scope_for_reporting


def get_activity_emissions(activity: dict, reporting_view: str = None) -> float:
    """
    Retourne les émissions d'une activité en tenant compte du dual reporting.
    Si reporting_view == 'location' et le facteur est market-based, utilise les émissions location.
    """
    if (
        reporting_view == "location"
        and activity.get("reporting_method") == "market"
        and activity.get("emissions_location") is not None
    ):
        return activity["emissions_location"]
    return activity.get("emissions", 0) or activity.get("calculated_emissions", 0) or 0


def calculate_scope_emissions(activities: list, reporting_view: str = None) -> dict:
    """
    Calcule les émissions par scope à partir d'une liste d'activités.
    Retourne un dict { "scope1": float, "scope2": float, "scope3_amont": float, "scope3_aval": float }
    """
    scope_emissions = {"scope1": 0, "scope2": 0, "scope3_amont": 0, "scope3_aval": 0}
    for activity in activities:
        raw_scope = activity.get("scope", "scope1")
        category = activity.get("category_id", "other")
        emissions = get_activity_emissions(activity, reporting_view)
        normalized = normalize_scope_for_reporting(raw_scope, category)
        if normalized in scope_emissions:
            scope_emissions[normalized] += emissions
    return scope_emissions


def calculate_category_emissions(activities: list, reporting_view: str = None) -> dict:
    """Calcule les émissions agrégées par catégorie."""
    category_emissions = {}
    for activity in activities:
        category = activity.get("category_id", "other")
        emissions = get_activity_emissions(activity, reporting_view)
        category_emissions[category] = category_emissions.get(category, 0) + emissions
    return category_emissions


def calculate_scope_completion(
    activities: list,
    real_categories: list,
    excluded_categories: list,
) -> dict:
    """
    Calcule le taux de complétion par scope.
    Pour chaque scope, compte combien de catégories non-exclues ont au moins une activité.
    """
    scope_completion = {}
    for scope_code in ["scope1", "scope2", "scope3_amont", "scope3_aval"]:
        open_cats = [
            c for c in real_categories
            if c.get("scope") == scope_code
            and c.get("code") not in excluded_categories
        ]
        effective_total = len(open_cats)
        filled = sum(
            1 for cat in open_cats
            if any(
                normalize_scope_for_reporting(a.get("scope", ""), a.get("category_id", "")) == scope_code
                and a.get("category_id") == cat["code"]
                for a in activities
            )
        )
        scope_completion[scope_code] = {
            "categories_filled": filled,
            "total_categories": effective_total,
            "percentage": round((filled / effective_total * 100) if effective_total > 0 else 0),
        }
    return scope_completion


def resolve_current_and_previous_fy(
    fiscal_years: list,
    fiscal_year_id: str,
    tenant_id: str,
    activities_collection,
) -> tuple:
    """
    Détermine l'exercice courant et le précédent pour le calcul des KPIs.
    Retourne (current_fy, previous_fy).
    """
    current_fy = None
    previous_fy = None

    if fiscal_year_id and fiscal_year_id != "current":
        current_fy = next((fy for fy in fiscal_years if str(fy["_id"]) == fiscal_year_id), None)
        if current_fy:
            current_start = current_fy.get("start_date", "")
            for fy in fiscal_years:
                if fy.get("start_date", "") < current_start:
                    previous_fy = fy
                    break
    else:
        for fy in fiscal_years:
            fy_id = str(fy["_id"])
            count = activities_collection.count_documents({
                "tenant_id": tenant_id,
                "fiscal_year_id": fy_id,
            })
            if count > 0:
                if not current_fy:
                    current_fy = fy
                else:
                    previous_fy = fy
                    break

        if not current_fy:
            for fy in fiscal_years:
                if fy.get("status") == "draft":
                    current_fy = fy
                    break

    return current_fy, previous_fy


def calculate_kpi_metrics(
    current_emissions: float,
    previous_emissions: float,
    context: dict,
) -> dict:
    """
    Calcule les métriques KPI : variation, émissions/employé, émissions/revenue.
    """
    variation_percent = 0
    variation_absolute = 0
    if previous_emissions > 0:
        variation_absolute = current_emissions - previous_emissions
        variation_percent = round((variation_absolute / previous_emissions) * 100, 1)

    employees = context.get("employees") or 0
    revenue = context.get("revenue") or 0

    emissions_per_employee = None
    if employees > 0 and current_emissions > 0:
        emissions_per_employee = round(current_emissions / employees, 2)

    emissions_per_revenue = None
    if revenue > 0 and current_emissions > 0:
        revenue_kchf = revenue / 1000
        if revenue_kchf > 0:
            emissions_per_revenue = round(current_emissions / revenue_kchf, 2)

    year_over_year_change = None
    if previous_emissions > 0 and current_emissions > 0:
        year_over_year_change = round(((current_emissions - previous_emissions) / previous_emissions) * 100, 1)

    return {
        "variation_percent": variation_percent,
        "variation_absolute": round(variation_absolute, 2),
        "emissions_per_employee": emissions_per_employee,
        "emissions_per_revenue": emissions_per_revenue,
        "year_over_year_change": year_over_year_change,
    }


def get_fiscal_year_context_with_fallback(
    fiscal_year_id: str, tenant_id: str,
    fiscal_years_col=None, companies_col=None,
) -> dict:
    """Get context from fiscal year with fallback to company."""
    from config import fiscal_years_collection, companies_collection
    fy_col = fiscal_years_col or fiscal_years_collection
    comp_col = companies_col or companies_collection

    company = comp_col.find_one({"tenant_id": tenant_id})

    if fiscal_year_id:
        try:
            fy = fy_col.find_one({"_id": ObjectId(fiscal_year_id)})
            if fy:
                ctx = fy.get("context", {})
                return {
                    "employees": ctx.get("employees") if ctx.get("employees") is not None else (company.get("employees") if company else None),
                    "revenue": ctx.get("revenue") if ctx.get("revenue") is not None else (company.get("revenue") if company else None),
                    "surface_area": ctx.get("surface_area") if ctx.get("surface_area") is not None else (company.get("surface_area") if company else None),
                    "excluded_categories": ctx.get("excluded_categories", []),
                }
        except Exception:
            pass

    if company:
        return {
            "employees": company.get("employees"),
            "revenue": company.get("revenue"),
            "surface_area": company.get("surface_area"),
            "excluded_categories": [],
        }

    return {"employees": None, "revenue": None, "surface_area": None, "excluded_categories": []}


def fetch_fy_emissions(tenant_id: str, fy: dict, reporting_view: str = None,
                       activities_col=None) -> tuple:
    """Fetch total emissions and activity count for a fiscal year."""
    from config import activities_collection
    col = activities_col or activities_collection

    if not fy:
        return 0, 0
    activities = list(col.find({
        "tenant_id": tenant_id, "fiscal_year_id": str(fy["_id"]),
    }))
    total = sum(get_activity_emissions(a, reporting_view) for a in activities)
    return total, len(activities)
