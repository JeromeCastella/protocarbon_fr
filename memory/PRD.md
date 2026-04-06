# Proto Carbon - Calculateur d'Empreinte Carbone

## Problem Statement
Application full-stack (React/FastAPI/MongoDB) pour la comptabilité carbone d'entreprise suivant le GHG Protocol. Inclut un calculateur d'émissions, un panneau d'administration avancé, des interfaces de saisie de données modernisées et un Atelier de Curation pour gérer ~9000 facteurs d'émission.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + MongoDB, port 8001
- **Integrations**: Gemini Pro / GPT-4o-mini via emergentintegrations (suggestions IA + traductions)
- **API URL Config**: Centralized in `utils/apiConfig.js` — uses relative URLs to avoid cross-origin issues

## Core Features Implemented
- Auth (localStorage + JWT Bearer Token)
- Dashboard avec métriques GHG Protocol
- Saisie de données (slide-over) + **Recherche globale de facteurs** (Fuse.js, toggle Expert)
- Gestion de produits (slide-over)
- Administration
- Facteurs d'émission avec grille/tableau
- Exercices fiscaux
- **Atelier de Curation (Phase 1 & 2)** — feature majeure
- **Vue tabulaire détaillée** : Slide-over panel pour activités par scope
- **Export MongoDB (mongodump)** : Bouton admin pour télécharger un dump complet
- **FEAT-DR Dual Reporting** : Toggle Market/Location sur Dashboard (tous endpoints)
- **FEAT-PLAUS Test de plausibilité** : Diagnostic de cohérence des données (11 règles V1)

## FEAT-PLAUS — Test de plausibilité (April 2026)
- Bouton "Lancer le diagnostic" dans l'onglet Suivi de saisie du Dashboard
- 11 règles métier indépendantes réparties en 3 familles :
  - **A. Cohérence vs. contexte** : émissions/ETP, émissions/m², émissions/kCHF, Scope 2 = 0 avec locaux, total = 0
  - **B. Cohérence interne** : activité dominante > 80%, outlier 10x moyenne, Scope 3 amont = 0
  - **C. Complétude** : catégories attendues par secteur, couverture catégories, activités vs taille
- Seuils placeholder dans `THRESHOLDS` (à affiner)
- Catégories attendues par secteur (13 secteurs configurés)
- Alertes classées par sévérité : critical (rouge), warning (ambre), info (bleu)
- Résultats animés avec badges résumé et contexte utilisé

## Dual Reporting Dashboard (April 2026)
- Toggle Market-based / Location-based propage `reporting_view` à TOUS les endpoints

## DB Schema - emission_factors
```
{
  id, name_fr, name_de, name_simple_fr, name_simple_de,
  source_product_name, subcategory, default_unit, is_public,
  popularity_score, curation_status, impacts[], region, source, year
}
```

## Key Files
- `frontend/src/pages/Dashboard.js` — Dashboard principal, onglet Suivi avec diagnostic plausibilité
- `frontend/src/components/DashboardResultsTab.js` — Onglet Résultats
- `frontend/src/pages/CurationWorkbench.jsx` — Page de curation
- `frontend/src/components/curation/LocationLinkPanel.jsx` — Panneau latéral liaison location
- `backend/routes/plausibility.py` — POST /check endpoint
- `backend/services/plausibility.py` — 11 règles métier, seuils, catégories par secteur
- `backend/routes/dashboard.py` — API dashboard (summary, kpis, scope-breakdown, fiscal-comparison)
- `backend/routes/objectives.py` — API objectifs SBTi
- `backend/routes/curation.py` — API de curation
- `backend/services/emissions.py` — Calcul d'émissions (dual reporting)
- `backend/config.py` — MongoDB connection
- `backend/server.py` — FastAPI app

## API Endpoints
- `POST /api/plausibility/check` — Diagnostic de plausibilité (fiscal_year_id optionnel)
- `GET /api/dashboard/summary` — Résumé (reporting_view)
- `GET /api/dashboard/kpis` — KPIs (reporting_view)
- `GET /api/dashboard/scope-breakdown/{id}` — Breakdown scopes (reporting_view)
- `GET /api/dashboard/fiscal-comparison` — Comparaison exercices (reporting_view)
- `GET /api/objectives/trajectory` — Trajectoire SBTi (reporting_view)
- `GET /api/curation/factors` — Liste paginée avec filtres
- `PATCH /api/curation/factors/{id}` — Édition en ligne
- `GET /api/curation/factors/search-location` — Recherche facteurs location
- `POST /api/auth/login` — Authentification

## Backlog
### P0
- **FEAT-CUR-03 — Regroupement par patterns**: Vue qui groupe les facteurs similaires pour corrections en masse rapides

### P1
- **FEAT-03 — Multi-utilisateurs**: Rôles Admin/Éditeur/Lecteur
- **Exports PDF/Excel**

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB (projections MongoDB dans dashboard.py)
- Refactoring composants React monolithiques (GuidedEntryModal.js, Dashboard.js, AdminFactorsTab.jsx, CurationWorkbench.jsx)

## Credentials
- Email: newtest@x.com / Password: test123
