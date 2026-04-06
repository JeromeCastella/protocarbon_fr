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
- Hook: `/hooks/useAdminFactors.js` (~400 lignes)
- Composants: `/components/admin/factors/`
  - `FactorsToolbar.jsx`, `FactorsTable.jsx`, `FactorsPagination.jsx`, `FactorFormModal.jsx`, `ImportModal.jsx`, `VersionModal.jsx`, `HistoryModal.jsx`, `index.js`
- Tests: 100% frontend (12/12 tests PASS)

### Phase 4 — Dashboard.js (COMPLETED — April 2026)
- **Avant**: 1782 lignes monolithiques
- **Après**: Orchestrateur ~110 lignes + hook + 6 sous-composants + constants
- Hook: `/hooks/useDashboard.js` (~336 lignes)
- Composants: `/components/dashboard-page/`
  - `DashboardHeader.jsx` (~80 lignes) — En-tête + toggle reporting + onglets
  - `TrackingTab.jsx` (~293 lignes) — Tab Suivi (stats, scope completion, gamification, plausibilité)
  - `ObjectivesTab.jsx` (~333 lignes) — Tab Objectifs (SBTi, scénarios, progression)
  - `TrajectoryChart.jsx` (~183 lignes) — Graphique recharts trajectoire de réduction
  - `ObjectiveModal.jsx` (~141 lignes) — Modal création objectif SBTi
  - `RecalcModal.jsx` (~239 lignes) — Modal recalcul émissions
  - `constants.js` (~47 lignes) — Utilitaires et constantes partagées
  - `index.js` — barrel export
- Tests: 100% frontend (11/11 tests PASS)

## Key Files
- `frontend/src/pages/Dashboard.js` — Orchestrateur dashboard (refactoré Phase 4)
- `frontend/src/hooks/useDashboard.js` — Hook logique dashboard
- `frontend/src/components/dashboard-page/` — Sous-composants dashboard
- `frontend/src/components/admin/AdminFactorsTab.jsx` — Orchestrateur facteurs (refactoré Phase 3)
- `frontend/src/hooks/useAdminFactors.js` — Hook logique facteurs
- `frontend/src/components/admin/factors/` — Sous-composants facteurs
- `backend/routes/plausibility.py` — POST /check endpoint
- `backend/services/plausibility.py` — 11 règles métier
- `backend/routes/dashboard.py` — API dashboard (reporting_view sur tous endpoints)
- `frontend/src/context/LanguageContext.js` — Hook i18n

## Backlog

### P0
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
