# Proto Carbon - Calculateur d'Empreinte Carbone

## Problem Statement
Application full-stack (React/FastAPI/MongoDB) pour la comptabilité carbone d'entreprise suivant le GHG Protocol. Inclut un calculateur d'émissions, un panneau d'administration avancé, des interfaces de saisie de données modernisées et un Atelier de Curation pour gérer ~9000 facteurs d'émission.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + MongoDB, port 8001
- **Integrations**: Gemini Pro / GPT-4o-mini via emergentintegrations (suggestions IA + traductions)

## Core Features Implemented
- Auth (sessionStorage + JWT Bearer Token, localStorage with "Remember Me")
- Dashboard avec métriques GHG Protocol
- Saisie de données (slide-over) + Recherche globale de facteurs (Fuse.js, toggle Expert)
- Gestion de produits (slide-over)
- Administration
- Facteurs d'émission avec grille/tableau
- Exercices fiscaux
- Atelier de Curation (Phase 1 & 2)
- Vue tabulaire détaillée : Slide-over panel pour activités par scope
- Export MongoDB (mongodump)
- FEAT-DR Dual Reporting : Toggle Market/Location sur Dashboard (tous endpoints)
- FEAT-PLAUS Test de plausibilité : Diagnostic de cohérence des données (11 règles V1)

## i18n (Internationalisation FR/DE) — COMPLETED
- Phase 1-7 complètes: Layout, Navigation, Dashboard, DataEntry, Admin, Curation, Settings, Auth/Aide

## Admin Factors Form — Réorganisé (April 2026)
- **Noms simplifiés FR/DE** en position principale
- **source_product_name** : nouveau champ éditable (nom technique BAFU/ecoinvent)
- **Noms techniques (name_fr/name_de)** : section repliable "Noms techniques (import)"
- **reporting_method** : sélecteur Location / Market / Non défini
- **popularity_score** : slider 0-100 (Rare → Courant)

## Refactoring — Réduction dette technique

### Phase 1 — DashboardResultsTab (COMPLETED)
- Composants: `EvolutionChart`, `KPICards`, `ScopeChart`, `TopSubcategories`, `RecommendationsList`, `constants`, `index`
- Dossier: `/components/dashboard/`

### Phase 2 — GuidedEntryModal (COMPLETED)
- Hook: `useGuidedEntry.js` (~390 lignes)
- Composant: `LeftPanel.js`
- Dossier: `/components/guided-entry/`

### Phase 3 — AdminFactorsTab (COMPLETED — April 2026)
- **Avant**: 1155 lignes monolithiques
- **Après**: Orchestrateur ~90 lignes + hook + 7 sous-composants
- Hook: `/hooks/useAdminFactors.js` (~400 lignes — toute la logique métier)
- Composants: `/components/admin/factors/`
  - `FactorsToolbar.jsx` — barre de recherche, filtres, boutons action
  - `FactorsTable.jsx` — tableau de données avec actions par ligne
  - `FactorsPagination.jsx` — contrôles de pagination
  - `FactorFormModal.jsx` — modal création/édition facteur + `ImpactsSection`
  - `ImportModal.jsx` — modal import JSON
  - `VersionModal.jsx` — modal création nouvelle version
  - `HistoryModal.jsx` — modal historique des versions
  - `index.js` — barrel export
- Tests: 100% frontend (12/12 tests PASS) — validated by testing agent

## Key Files
- `frontend/src/pages/DataEntry.js` — Dashboard principal
- `frontend/src/components/admin/AdminFactorsTab.jsx` — Orchestrateur facteurs (refactoré)
- `frontend/src/hooks/useAdminFactors.js` — Hook logique facteurs
- `frontend/src/components/admin/factors/` — Sous-composants facteurs
- `backend/routes/plausibility.py` — POST /check endpoint
- `backend/services/plausibility.py` — 11 règles métier
- `backend/routes/dashboard.py` — API dashboard (reporting_view sur tous endpoints)
- `frontend/src/context/LanguageContext.js` — Hook i18n
- `frontend/src/locales/fr.json` — Traductions FR (~1100 clés)
- `frontend/src/locales/de.json` — Traductions DE (~1100 clés)

## API Endpoints
- `POST /api/plausibility/check` — Diagnostic de plausibilité
- `PUT /api/admin/emission-factors-v2/{id}` — Mise à jour facteur
- `GET /api/dashboard/summary|kpis|scope-breakdown|fiscal-comparison` — reporting_view
- `GET /api/objectives/trajectory` — reporting_view

## Code Quality Fixes (April 2026)
- Hardcoded secrets removed from 16 test files → centralized in conftest_credentials.py
- Token storage: sessionStorage by default, localStorage only with "Remember Me"
- All components use useAuth().token instead of direct localStorage access
- React hook dependencies fixed (token added to CurationWorkbench useCallback/useEffect)
- Array index keys replaced with stable identifiers (AdminFactorsTab, GuidedEntryModal)
- console.log replaced with logger utility (LocationLinkPanel)

## Backlog

### P0
- **Refactoring Phase 4 — Dashboard.js** (1696 lignes): Découpage du composant le plus lourd
- **Refactoring Backend** — `curation.py` (list_curation_factors), `activities.py` (create_activity_for_impact, apply_business_rules)
- **FEAT-CUR-03 — Regroupement par patterns**: Vue qui groupe les facteurs similaires

### P1
- **FEAT-03 — Multi-utilisateurs**: Rôles Admin/Éditeur/Lecteur
- **Exports PDF/Excel**

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB (projections MongoDB dans dashboard.py)
- Type hints Python et Migration TypeScript (progressif)

## Credentials
- Email: newtest@x.com / Password: test123

## Known Issues
- Déploiement production KO (HTTP 520) — L'utilisateur doit configurer le secret FRONTEND_URL
- ESLint plugin react-hooks v7 incompatible avec CRA ESLint 8 — contourné avec DISABLE_ESLINT_PLUGIN=true
