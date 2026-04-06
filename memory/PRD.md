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
    │   │   ├── admin/factors/
    │   │   ├── dashboard-page/
    │   │   ├── general-info/ (CompanyIdentityCard, FiscalYearContextCard, ScopePerimeterCard, WizardModal)
    │   │   ├── fiscal-years/ (FiscalYearCard, FiscalYearModals)
    │   │   ├── data-entry/ (TableViewPanel, GlobalFactorSearch)
    │   │   ├── curation-workbench/ (StatsDashboard, BulkActionsBar, EditableCell, StatusBadge, AISuggestModal, TranslatePreviewModal, BulkPreviewModal, JsonViewerModal, CurationTable)
    │   │   └── assistance/ (assistanceData.js, FaqTab, FactorsTab, FactorDetailModal)
    │   ├── hooks/ (useAdminFactors, useDashboard, useGeneralInfo, useFiscalYearsPage, useCurationWorkbench, useAssistance)
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
### Phase 1 — Key Props (06/04/2026)
- 6 instances d'index-as-key corrigées
- Python `is` vs `==` : confirmé faux positif

### Phase 2 — React Hook Dependencies (06/04/2026)
- fetchData -> useCallback dans DataEntry.js, GeneralInfo.js, FiscalYears.js

### Phase 3 — Sécurité Token Storage (Reporté)
- Décision : reporter à plus tard

### Phase 4 — Refactoring Backend (06/04/2026)
- dashboard.py : 461 -> ~260 lignes, services/dashboard_service.py
- curation.py : logique extraite vers services/curation_service.py

### Phase 5 — Refactoring Frontend COMPLET (06/04/2026)
- GeneralInfo.js : 1338 -> 91 lignes (hook + 4 sous-composants)
- FiscalYears.js : 1047 -> 77 lignes (hook + 2 sous-composants)
- DataEntry.js : 1506 -> 883 lignes (2 composants extraits + bug token corrigé)
- CurationWorkbench.jsx : 1193 -> 135 lignes (hook + 9 sous-composants)
- Assistance.js : 841 -> 71 lignes (hook + 4 sous-composants)
- Tests validés : iteration_67 (100%) + iteration_68 (100%)

### Phase 6 — Type Hints Python (A venir)

## Backlog (P0-P2)
- **P0**: FEAT-CUR-03 — Regroupement par patterns (atelier curation)
- **P1**: FEAT-03 — Gestion multi-utilisateurs (rôles)
- **P1**: Exports PDF/Excel
- **P2**: Base de données actions plan climat cantonal
- **P2**: Logs d'audit
- **P2**: Optimisation requêtes DB (projections MongoDB)
- **P2**: Type hints Python progressif
- **P2**: Sécurité Token Storage (HTTP-only cookies ou short-lived tokens)
- **P2**: Ternaires imbriqués (208 instances restantes)
- **P2**: Migration TypeScript progressive

## Intégrations 3P
- Google Gemini Pro (Emergent LLM Key) — module de curation
- MongoDB Atlas

## Problème connu
- Déploiement Production KO : secret FRONTEND_URL manquant (action utilisateur requise)
