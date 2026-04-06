"""
Service de test de plausibilité — Règles métier V1

Chaque règle est une fonction indépendante qui reçoit un contexte
et retourne une liste d'alertes (possiblement vide).
"""

# ---------------------------------------------------------------------------
# Seuils placeholder — à affiner avec l'usage
# ---------------------------------------------------------------------------
THRESHOLDS = {
    "emissions_per_fte_min_t": 0.5,      # tCO₂e / ETP
    "emissions_per_fte_max_t": 50,        # tCO₂e / ETP
    "emissions_per_m2_max_kg": 200,       # kgCO₂e / m²
    "emissions_per_kchf_max_t": 5,        # tCO₂e / kCHF
    "single_activity_scope_pct": 80,      # % d'un scope dominé par 1 activité
    "outlier_factor": 10,                 # activité > 10× la moyenne du scope
    "min_categories_pct": 20,             # % minimum de catégories remplies
    "min_activities_per_100_fte": 3,       # activités minimum par 100 ETP
}

# ---------------------------------------------------------------------------
# Catégories attendues par secteur
# (si le secteur figure ici ET que la catégorie est vide → alerte)
# ---------------------------------------------------------------------------
EXPECTED_CATEGORIES_BY_SECTOR = {
    "services": [
        "electricite", "deplacements_professionnels",
        "deplacements_domicile_travail", "biens_services_achetes",
    ],
    "technology": [
        "electricite", "deplacements_professionnels",
        "deplacements_domicile_travail", "biens_services_achetes",
    ],
    "manufacturing": [
        "combustion_fixe", "electricite",
        "biens_services_achetes", "biens_equipement",
        "transport_distribution_amont", "dechets_operations",
    ],
    "retail": [
        "electricite", "transport_distribution_amont",
        "biens_services_achetes", "deplacements_domicile_travail",
    ],
    "construction": [
        "combustion_mobile", "combustion_fixe", "electricite",
        "biens_equipement", "dechets_operations",
    ],
    "transport": [
        "combustion_mobile", "electricite",
        "deplacements_professionnels",
    ],
    "energy": [
        "combustion_fixe", "emissions_procedes",
        "electricite", "emissions_fugitives",
    ],
    "agriculture": [
        "combustion_mobile", "combustion_fixe",
        "emissions_procedes", "electricite",
    ],
    "healthcare": [
        "electricite", "chaleur_vapeur",
        "biens_services_achetes", "dechets_operations",
        "deplacements_domicile_travail",
    ],
    "education": [
        "electricite", "chaleur_vapeur",
        "deplacements_domicile_travail",
    ],
    "finance": [
        "electricite", "deplacements_professionnels",
        "deplacements_domicile_travail", "biens_services_achetes",
    ],
    "hospitality": [
        "electricite", "chaleur_vapeur", "combustion_fixe",
        "biens_services_achetes", "dechets_operations",
    ],
}

CATEGORY_LABELS_FR = {
    "combustion_mobile": "Combustion mobile",
    "combustion_fixe": "Combustion fixe",
    "emissions_procedes": "Émissions de procédés",
    "emissions_fugitives": "Émissions fugitives",
    "electricite": "Électricité",
    "chaleur_vapeur": "Chaleur et vapeur",
    "refroidissement": "Refroidissement",
    "biens_services_achetes": "Biens et services achetés",
    "biens_equipement": "Biens d'équipement",
    "activites_combustibles_energie": "Activités liées aux combustibles",
    "transport_distribution_amont": "Transport et distribution amont",
    "dechets_operations": "Déchets des opérations",
    "deplacements_professionnels": "Déplacements professionnels",
    "deplacements_domicile_travail": "Déplacements pendulaires",
    "actifs_loues_amont": "Actifs loués en amont",
    "transport_distribution_aval": "Transport et distribution aval",
    "transformation_produits": "Transformation des produits",
    "utilisation_produits": "Utilisation des produits",
    "fin_vie_produits": "Fin de vie des produits",
    "actifs_loues_aval": "Actifs loués en aval",
    "franchises": "Franchises",
    "investissements": "Investissements",
}

SCOPE_LABELS = {
    "scope1": "Scope 1",
    "scope2": "Scope 2",
    "scope3_amont": "Scope 3 Amont",
    "scope3_aval": "Scope 3 Aval",
}


def _alert(severity: str, message: str, rule: str) -> dict:
    return {"severity": severity, "message": message, "rule": rule}


# ── A. Cohérence vs. contexte entreprise ──────────────────────────────────

def check_emissions_per_fte(ctx) -> list:
    """Émissions / ETP hors fourchette."""
    employees = ctx["employees"]
    total_t = ctx["total_emissions"] / 1000
    if not employees or employees <= 0 or total_t <= 0:
        return []
    ratio = total_t / employees
    alerts = []
    if ratio < THRESHOLDS["emissions_per_fte_min_t"]:
        alerts.append(_alert(
            "warning",
            f"Émissions très faibles par employé ({ratio:.1f} tCO₂e/ETP). Vérifiez si toutes les activités ont été saisies.",
            "emissions_per_fte_low",
        ))
    if ratio > THRESHOLDS["emissions_per_fte_max_t"]:
        alerts.append(_alert(
            "warning",
            f"Émissions très élevées par employé ({ratio:.1f} tCO₂e/ETP). Vérifiez les volumes saisis.",
            "emissions_per_fte_high",
        ))
    return alerts


def check_emissions_per_m2(ctx) -> list:
    """Émissions / m² hors fourchette."""
    surface = ctx["surface_area"]
    total_kg = ctx["total_emissions"]
    if not surface or surface <= 0 or total_kg <= 0:
        return []
    ratio = total_kg / surface
    if ratio > THRESHOLDS["emissions_per_m2_max_kg"]:
        return [_alert(
            "warning",
            f"Émissions élevées par m² ({ratio:.0f} kgCO₂e/m²). Vérifiez la surface déclarée ou les données de combustion.",
            "emissions_per_m2_high",
        )]
    return []


def check_emissions_per_revenue(ctx) -> list:
    """Émissions / kCHF hors fourchette."""
    revenue = ctx["revenue"]
    total_t = ctx["total_emissions"] / 1000
    if not revenue or revenue <= 0 or total_t <= 0:
        return []
    kchf = revenue / 1000
    ratio = total_t / kchf
    if ratio > THRESHOLDS["emissions_per_kchf_max_t"]:
        return [_alert(
            "warning",
            f"Émissions élevées par rapport au CA ({ratio:.2f} tCO₂e/kCHF). Vérifiez le chiffre d'affaires ou les volumes.",
            "emissions_per_revenue_high",
        )]
    return []


def check_scope2_zero_with_premises(ctx) -> list:
    """Scope 2 = 0 alors que l'entreprise a des locaux."""
    surface = ctx["surface_area"]
    scope2 = ctx["scope_emissions"].get("scope2", 0)
    if surface and surface > 0 and scope2 == 0:
        return [_alert(
            "critical",
            "Aucune émission Scope 2 (électricité, chaleur) alors que vous déclarez des locaux. Avez-vous saisi votre consommation d'énergie ?",
            "scope2_zero_with_premises",
        )]
    return []


def check_total_zero_with_activities(ctx) -> list:
    """Total = 0 alors que des activités existent."""
    if ctx["activities_count"] > 0 and ctx["total_emissions"] == 0:
        return [_alert(
            "critical",
            f"{ctx['activities_count']} activités saisies mais les émissions totales sont nulles. Vérifiez les facteurs d'émission et les quantités.",
            "total_zero_with_activities",
        )]
    return []


# ── B. Cohérence interne ──────────────────────────────────────────────────

def check_single_activity_dominance(ctx) -> list:
    """Une activité représente > 80% d'un scope."""
    alerts = []
    threshold_pct = THRESHOLDS["single_activity_scope_pct"]
    for scope_key, activities in ctx["activities_by_scope"].items():
        scope_total = ctx["scope_emissions"].get(scope_key, 0)
        if scope_total <= 0 or len(activities) < 2:
            continue
        for act in activities:
            act_emissions = act.get("emissions", 0) or 0
            pct = (act_emissions / scope_total) * 100 if scope_total else 0
            if pct >= threshold_pct:
                label = SCOPE_LABELS.get(scope_key, scope_key)
                name = (act.get("description") or act.get("factor_name") or "Activité")[:60]
                alerts.append(_alert(
                    "warning",
                    f"L'activité \"{name}\" représente {pct:.0f}% du {label}. Vérifiez cette concentration.",
                    "single_activity_dominance",
                ))
    return alerts


def check_outlier_in_scope(ctx) -> list:
    """Valeur d'une activité > 10× la moyenne du scope."""
    alerts = []
    factor = THRESHOLDS["outlier_factor"]
    for scope_key, activities in ctx["activities_by_scope"].items():
        if len(activities) < 3:
            continue
        emissions_list = [a.get("emissions", 0) or 0 for a in activities]
        avg = sum(emissions_list) / len(emissions_list) if emissions_list else 0
        if avg <= 0:
            continue
        for act in activities:
            e = act.get("emissions", 0) or 0
            if e > avg * factor:
                label = SCOPE_LABELS.get(scope_key, scope_key)
                name = (act.get("description") or act.get("factor_name") or "Activité")[:60]
                alerts.append(_alert(
                    "info",
                    f"L'activité \"{name}\" dans {label} est {e/avg:.0f}× supérieure à la moyenne du scope. Valeur à vérifier.",
                    "outlier_in_scope",
                ))
    return alerts


def check_scope3_amont_zero(ctx) -> list:
    """Scope 3 amont = 0 (quasi-impossible pour toute entreprise)."""
    if ctx["scope_emissions"].get("scope3_amont", 0) == 0 and ctx["total_emissions"] > 0:
        return [_alert(
            "critical",
            "Aucune émission Scope 3 Amont (achats, déplacements, déchets…). Ce scope est pertinent pour la quasi-totalité des organisations.",
            "scope3_amont_zero",
        )]
    return []


# ── C. Complétude ─────────────────────────────────────────────────────────

def check_expected_categories_by_sector(ctx) -> list:
    """Catégories attendues vides selon le secteur d'activité."""
    sector = ctx.get("sector", "")
    expected = EXPECTED_CATEGORIES_BY_SECTOR.get(sector, [])
    if not expected:
        return []
    filled = ctx["filled_categories"]
    excluded = set(ctx.get("excluded_categories", []))
    missing = [c for c in expected if c not in filled and c not in excluded]
    if not missing:
        return []
    names = ", ".join(CATEGORY_LABELS_FR.get(c, c) for c in missing[:4])
    extra = f" (+{len(missing)-4} autres)" if len(missing) > 4 else ""
    return [_alert(
        "warning",
        f"Catégories habituellement renseignées pour le secteur « {sector} » mais vides : {names}{extra}.",
        "expected_categories_missing",
    )]


def check_low_category_coverage(ctx) -> list:
    """Moins de X% de catégories remplies."""
    total_cats = ctx["total_categories"]
    filled_count = len(ctx["filled_categories"])
    if total_cats <= 0:
        return []
    pct = (filled_count / total_cats) * 100
    if pct < THRESHOLDS["min_categories_pct"]:
        return [_alert(
            "info",
            f"Seulement {filled_count}/{total_cats} catégories remplies ({pct:.0f}%). Le bilan semble encore incomplet.",
            "low_category_coverage",
        )]
    return []


def check_few_activities_vs_size(ctx) -> list:
    """Peu d'activités vs. taille de l'entreprise."""
    employees = ctx.get("employees") or 0
    count = ctx["activities_count"]
    if employees <= 0 or count <= 0:
        return []
    ratio = count / (employees / 100)
    if ratio < THRESHOLDS["min_activities_per_100_fte"]:
        return [_alert(
            "info",
            f"Seulement {count} activités pour {employees} employés. Des postes d'émission sont probablement manquants.",
            "few_activities_vs_size",
        )]
    return []


# ---------------------------------------------------------------------------
# Registre de toutes les règles (ordre = ordre d'affichage)
# ---------------------------------------------------------------------------
ALL_RULES = [
    check_total_zero_with_activities,
    check_scope2_zero_with_premises,
    check_scope3_amont_zero,
    check_emissions_per_fte,
    check_emissions_per_m2,
    check_emissions_per_revenue,
    check_single_activity_dominance,
    check_outlier_in_scope,
    check_expected_categories_by_sector,
    check_low_category_coverage,
    check_few_activities_vs_size,
]


def run_all_checks(ctx: dict) -> list[dict]:
    """Exécute toutes les règles et retourne les alertes triées par sévérité."""
    alerts = []
    for rule_fn in ALL_RULES:
        alerts.extend(rule_fn(ctx))

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 9))
    return alerts
