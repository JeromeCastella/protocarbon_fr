"""
Normalisation des scopes GHG Protocol.
Module partagé entre les routes activities et dashboard.
"""

# Catégories Scope 3 Amont (GHG Protocol)
SCOPE3_AMONT_CATEGORIES = {
    'biens_services_achetes', 'biens_equipement', 'activites_combustibles_energie',
    'transport_distribution_amont', 'dechets_operations', 'deplacements_professionnels',
    'deplacements_domicile_travail', 'actifs_loues_amont'
}

# Catégories Scope 3 Aval (GHG Protocol)
SCOPE3_AVAL_CATEGORIES = {
    'transport_distribution_aval', 'transformation_produits', 'utilisation_produits',
    'fin_vie_produits', 'actifs_loues_aval', 'franchises', 'investissements'
}


def normalize_scope_for_reporting(scope: str, category_id: str = None) -> str:
    """
    Normalise les scopes granulaires vers les 4 scopes de reporting :
    scope1, scope2, scope3_amont, scope3_aval.
    
    Mapping :
    - scope1 → scope1
    - scope2 → scope2
    - scope3_3 → scope3_amont (car 3.3 = amont énergie)
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
    if scope_lower in ['scope3_3', 'scope3.3', 'scope33']:
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
