"""
Service métier des activités : règles GHG Protocol, calculs, dual reporting.
Extrait de routes/activities.py pour testabilité et réutilisation.
"""
from datetime import datetime, timezone
from bson import ObjectId

from config import emission_factors_collection, fiscal_years_collection
from services.emissions import create_factor_snapshot
from services.scope_mapping import normalize_scope_for_reporting


# ─── Normalisation scope ───

def normalize_scope(scope: str) -> str:
    """Normalise les différentes notations de scope vers un format standard."""
    if not scope:
        return ''
    scope_lower = scope.lower().strip()
    if scope_lower in ['scope3_3', 'scope3.3', 'scope33']:
        return 'scope3_3'
    return scope_lower


# ─── Règles métier GHG Protocol ───

def apply_business_rules(impacts: list, entry_scope: str, entry_category: str) -> list:
    """
    Filtre les impacts selon les règles GHG Protocol.

    - Saisie Scope 1 ou 2 → scope1, scope2, scope3_3
    - Saisie Scope 3.3 (activites_combustibles_energie) → scope3_3 uniquement
    - Saisie Scope 3 (autres) → scope3 uniquement
    - value = 0 → exclus
    """
    if not impacts:
        return impacts

    normalized = normalize_scope(entry_scope) if entry_scope else ''
    is_scope1_or_2 = normalized in ['scope1', 'scope2']
    is_scope3_3 = (entry_category == 'activites_combustibles_energie' or normalized == 'scope3_3')
    is_scope3_other = normalized.startswith('scope3') and not is_scope3_3

    filtered = []
    for impact in impacts:
        impact_scope = normalize_scope(impact.get('scope', ''))
        if impact.get('value', 0) == 0:
            continue

        if is_scope1_or_2:
            if impact_scope not in ['scope1', 'scope2', 'scope3_3']:
                continue
        elif is_scope3_3:
            if impact_scope != 'scope3_3':
                continue
        elif is_scope3_other:
            if impact_scope != 'scope3':
                continue

        filtered.append(impact)

    return filtered


# ─── Résolution date / quantité ───

def resolve_activity_date(activity_date, fiscal_year_id):
    """Date fournie > milieu de l'exercice fiscal > date du jour."""
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


def resolve_quantity(activity, factor) -> float:
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


def resolve_quantity_from_values(quantity: float, unit: str, factor: dict) -> float:
    """Applique la conversion d'unité si nécessaire (variante sans objet Activity)."""
    default_unit = factor.get("default_unit", unit)
    if unit == default_unit:
        return quantity
    unit_conversions = factor.get("unit_conversions", {})
    conversion_key = f"{unit}_to_{default_unit}"
    if conversion_key in unit_conversions:
        return quantity * unit_conversions[conversion_key]
    return quantity


# ─── Dual Reporting ───

def compute_dual_reporting(factor: dict, impact_scope: str, quantity: float):
    """Calcule les émissions location-based si le facteur est market-based.

    Returns:
        tuple: (emissions_location, location_factor_snapshot) or (None, None)
    """
    if factor.get("reporting_method") != "market" or not factor.get("location_factor_id"):
        return None, None

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

    if not loc_factor:
        return None, None

    loc_impacts = loc_factor.get("impacts", [])
    matching = next(
        (i for i in loc_impacts if normalize_scope(i.get("scope", "")) == impact_scope),
        loc_impacts[0] if loc_impacts else None
    )
    emissions_location = quantity * matching.get("value", 0) if matching else None
    return emissions_location, create_factor_snapshot(loc_factor)


# ─── Recalcul émissions (update) ───

def recalculate_emissions(existing: dict, update_data: dict) -> dict:
    """Recalcule les émissions si la quantité ou le facteur a changé."""
    from utils import find_emission_factor

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
