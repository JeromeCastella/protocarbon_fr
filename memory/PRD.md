# Proto Carbon - Calculateur d'Empreinte Carbone

## Problème Original
Calculateur d'empreinte carbone pour entreprise suivant le GHG Protocol. Application full-stack React/FastAPI/MongoDB avec saisie de données, curation des facteurs d'émission, gestion multi-exercices, rapports détaillés, Dual Reporting, diagnostics de plausibilité et internationalisation (i18n FR/DE).

## Architecture
```
/app/
├── backend/
│   ├── routes/ (dashboard.py, curation.py, activities.py, fiscal_years.py, ...)
│   ├── services/ (dashboard_service.py, curation_service.py, activity_service.py, scope_mapping.py, plausibility.py, auth.py)
│   ├── models/
│   └── utils/
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── admin/factors/ (Phase 3 refactoring)
    │   │   ├── dashboard-page/ (Phase 4 refactoring)
    │   │   ├── general-info/ (Phase 5 refactoring: CompanyIdentityCard, FiscalYearContextCard, ScopePerimeterCard, WizardModal)
    │   │   ├── fiscal-years/ (Phase 5 refactoring: FiscalYearCard, FiscalYearModals)
    │   │   └── data-entry/ (Phase 5 refactoring: TableViewPanel, GlobalFactorSearch)
    │   ├── hooks/ (useAdminFactors, useDashboard, useGeneralInfo, useFiscalYearsPage)
    │   ├── pages/
    │   └── context/
```

## Ce qui est implémenté
- Saisie de données par scope/catégorie (GHG Protocol complet)
- Curation des facteurs d'émission (atelier admin, IA Gemini)
- Gestion multi-exercices fiscaux + scénarios
- Dashboard avec KPIs, breakdown par scope, comparaison inter-exercices
- Dual Reporting (market/location-based)
- Diagnostics de plausibilité
- Internationalisation FR/DE
- Gestion des produits vendus (fiches produit)
- Configuration guidée du périmètre (wizard)

## Revue de Code (6 phases)
### Phase 1 — Key Props ✅ (06/04/2026)
- 6 instances d'index-as-key corrigées (StepEndOfLife, RecommendationsList, ProductWizard, ProductDetailModal, PasswordStrength)
- Python `is` vs `==` : confirmé faux positif (0 vrais problèmes)

### Phase 2 — React Hook Dependencies ✅ (06/04/2026)
- fetchData → useCallback dans DataEntry.js, GeneralInfo.js, FiscalYears.js
- Suppression des eslint-disable-next-line dans GeneralInfo.js et FiscalYears.js

### Phase 3 — Sécurité Token Storage ⏸️ (Reporté par l'utilisateur)
- Pros/cons présentés (HTTP-only cookies vs short-lived tokens vs statu quo)
- Décision : reporter à plus tard

### Phase 4 — Refactoring Backend ✅ (06/04/2026)
- dashboard.py : 461 → ~260 lignes. 6 helpers DRY extraits vers services/dashboard_service.py
- curation.py : curation_stats (69→21 lignes), suggest_titles (80→23 lignes), logique extraite vers services/curation_service.py
- fiscal_years.py : import corrigé de routes.dashboard → services.scope_mapping

### Phase 5 — Refactoring Frontend ✅ (06/04/2026)
- GeneralInfo.js : 1338 → 91 lignes (hook + 4 sous-composants)
- FiscalYears.js : 1047 → 77 lignes (hook + 2 sous-composants)
- DataEntry.js : 1506 → 883 lignes (2 composants inline extraits + bug token corrigé)
- Bug corrigé : GlobalFactorSearch utilisait `token` non défini dans son scope

### Phase 6 — Type Hints Python 🔜 (À venir)

## Backlog (P0-P2)
- **P0**: FEAT-CUR-03 — Regroupement par patterns (atelier curation)
- **P1**: FEAT-03 — Gestion multi-utilisateurs (rôles)
- **P1**: Exports PDF/Excel
- **P1**: Refactoring CurationWorkbench.jsx (1192 lignes) et Assistance.js (840 lignes)
- **P2**: Base de données actions plan climat cantonal
- **P2**: Logs d'audit
- **P2**: Optimisation requêtes DB (projections MongoDB)
- **P2**: Type hints Python progressif
- **P2**: Sécurité Token Storage (HTTP-only cookies ou short-lived tokens)

## Intégrations 3P
- Google Gemini Pro (Emergent LLM Key) — module de curation
- MongoDB Atlas

## Problème connu
- Déploiement Production KO : secret FRONTEND_URL manquant (action utilisateur requise)
