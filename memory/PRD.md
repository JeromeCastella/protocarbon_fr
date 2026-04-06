# Proto Carbon - Calculateur d'Empreinte Carbone

## Problème Original
Calculateur d'empreinte carbone pour entreprise suivant le GHG Protocol. Application full-stack React/FastAPI/MongoDB avec saisie de données, curation des facteurs d'émission, gestion multi-exercices, rapports détaillés, Dual Reporting, diagnostics de plausibilité et internationalisation (i18n FR/DE).

## Architecture
```
/app/
├── backend/
│   ├── routes/ (dashboard.py, curation.py, activities.py, fiscal_years.py, export.py, ...)
│   ├── services/ (dashboard_service.py, curation_service.py)
│   ├── models/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── general-info/ (4 composants)
    │   │   ├── fiscal-years/ (2 composants)
    │   │   ├── data-entry/ (2 composants)
    │   │   ├── curation-workbench/ (9 composants)
    │   │   └── assistance/ (4 composants)
    │   ├── hooks/ (useGeneralInfo, useFiscalYearsPage, useCurationWorkbench, useAssistance, ...)
    │   ├── pages/
    │   └── context/
```

## Revue de Code — Phases Complétées

### Phase 1 — Key Props (06/04/2026) DONE
### Phase 2 — React Hook Dependencies (06/04/2026) DONE
### Phase 3 — Sécurité Token Storage → BACKLOG (décision utilisateur)
### Phase 4 — Backend Service Layer (06/04/2026) DONE
### Phase 5 — Frontend Component Decomposition (06/04/2026) DONE
- GeneralInfo.js : 1338 → 91 lignes
- FiscalYears.js : 1047 → 77 lignes
- DataEntry.js : 1506 → 883 lignes (partiel)
- CurationWorkbench.jsx : 1193 → 135 lignes
- Assistance.js : 841 → 71 lignes

### Phase A — Backend Complexity Refactoring (06/04/2026) DONE
- **fiscal_years.py** : `duplicate_fiscal_year` (complexité 25 → ~10). Extraits : `_copy_context_fields`, `_resolve_context_from_source_or_company`, `_initialize_fy_context`, `_resolve_scenario_info`, `_validate_duplicate_target`, `_duplicate_activities`. `create_fiscal_year` réduit aussi.
- **dashboard.py** : `get_dashboard_kpis` simplifié. `get_fiscal_year_context_with_fallback` et `fetch_fy_emissions` migrés vers `dashboard_service.py`.
- **export.py** : `serialize_for_export` réduit (22 → 15 lignes). Extraits : `_collect_export_data`, `_write_collection_to_zip`.
- **activities.py** : `create_activity_for_impact` et `create_activity` réduits. Extraits : `_compute_impact_emissions`, `_get_factor_impacts`.
- **curation.py** : 12 paramètres query → classe `CurationFilters` (Depends).
- **tests** : Secret hardcodé supprimé de `test_code_refactoring_phase5.py`.
- Tests : iteration_69.json — 100% (26 backend + 3 frontend)

## Backlog (P0-P2)
- **P0**: FEAT-CUR-03 — Regroupement par patterns (atelier curation)
- **P1**: Phase B — Découpage composants restants (DataEntry 883L, AdminExportTab 516L, ProductVersionsModal 514L, ProductSaleModal 497L, FactorSelectionStep 307L, FiscalYearSelector 270L, Layout 175L)
- **P1**: Phase C — React Hook Dependencies (107 instances)
- **P1**: FEAT-03 — Gestion multi-utilisateurs (rôles)
- **P1**: Exports PDF/Excel
- **P2**: Phase D — Ternaires imbriqués (207) + Inline Objects Props (370)
- **P2**: Type Hints Python progressif
- **P2**: Sécurité Token Storage (HTTP-only cookies)
- **P2**: Base de données plan climat cantonal
- **P2**: Logs d'audit, Optimisation DB, Migration TypeScript

## Intégrations 3P
- Google Gemini Pro (Emergent LLM Key) — module de curation

## Problème connu
- Déploiement Production KO : secret FRONTEND_URL manquant (action utilisateur requise)
