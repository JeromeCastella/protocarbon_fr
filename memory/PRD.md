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
- Administration: Facteurs d'émission, Exercices fiscaux, Atelier de Curation (Phase 1 & 2)
- Vue tabulaire détaillée : Slide-over panel pour activités par scope
- Export MongoDB (mongodump)
- FEAT-DR Dual Reporting : Toggle Market/Location sur Dashboard
- FEAT-PLAUS Test de plausibilité : 11 règles métier
- i18n (Internationalisation FR/DE) — 7 phases complètes

## Refactoring — Réduction dette technique

### Frontend — Composants React

| Phase | Composant | Avant | Après | Status |
|-------|-----------|-------|-------|--------|
| 1 | DashboardResultsTab | monolithique | 5 sous-composants dans `/components/dashboard/` | DONE |
| 2 | GuidedEntryModal | monolithique | hook `useGuidedEntry.js` + `LeftPanel.js` | DONE |
| 3 | AdminFactorsTab | 1155 lignes | ~90 lignes + hook + 7 sous-composants dans `/components/admin/factors/` | DONE |
| 4 | Dashboard.js | 1782 lignes | ~110 lignes + hook + 6 sous-composants dans `/components/dashboard-page/` | DONE |

### Backend — Services métier (April 2026)

| Source | Cible | Fonctions extraites | Status |
|--------|-------|---------------------|--------|
| `routes/curation.py` | `services/curation_service.py` | `build_factor_id_filters`, `build_curation_query`, `resolve_sort_field`, `resolve_location_names`, `resolve_single_location_name` | DONE |
| `routes/activities.py` | `services/activity_service.py` | `normalize_scope`, `apply_business_rules`, `resolve_activity_date`, `resolve_quantity`, `resolve_quantity_from_values`, `compute_dual_reporting`, `recalculate_emissions` | DONE |

**Gains backend :**
- `curation.py` : 819 → ~720 lignes (-12%), DRY (5x `or_filters` → 1 helper)
- `activities.py` : 703 → ~520 lignes (-26%), logique métier testable indépendamment
- Tests de régression : 14 tests pytest dans `/backend/tests/test_refactored_services.py`

## Key Files
- `frontend/src/pages/Dashboard.js` — Orchestrateur dashboard
- `frontend/src/hooks/useDashboard.js` — Hook logique dashboard
- `frontend/src/components/dashboard-page/` — Sous-composants dashboard
- `frontend/src/components/admin/AdminFactorsTab.jsx` — Orchestrateur facteurs
- `frontend/src/hooks/useAdminFactors.js` — Hook logique facteurs
- `frontend/src/components/admin/factors/` — Sous-composants facteurs
- `backend/services/curation_service.py` — Helpers curation
- `backend/services/activity_service.py` — Logique métier activités
- `backend/routes/curation.py` — Routes curation (allégé)
- `backend/routes/activities.py` — Routes activités (allégé)

## Backlog

### P0
- **FEAT-CUR-03 — Regroupement par patterns**: Vue qui groupe les facteurs similaires. Endpoint: `/api/curation/groups`.

### P1
- **FEAT-03 — Multi-utilisateurs**: Rôles Admin/Éditeur/Lecteur
- **Exports PDF/Excel**

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB (projections MongoDB)
- Type hints Python et Migration TypeScript (progressif)

## Credentials
- Email: newtest@x.com / Password: test123

## Known Issues
- Déploiement production KO (HTTP 520) — L'utilisateur doit configurer le secret FRONTEND_URL
- ESLint plugin react-hooks v7 incompatible avec CRA ESLint 8 — contourné avec DISABLE_ESLINT_PLUGIN=true
