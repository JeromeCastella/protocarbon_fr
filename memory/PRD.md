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
- **Vue tabulaire détaillée** : Slide-over panel pour activités par scope (Facteur, %, Source, Commentaire)
- **Export MongoDB (mongodump)** : Bouton admin pour télécharger un dump complet de la base au format .archive (compatible mongorestore pour migration)

## Production Deployment Fixes (April 2026)
- **requirements.txt** regenerated via pip freeze — added `email-validator`, `dnspython`, `emergentintegrations` (were missing, causing ImportError crash)
- **Health check** simplified to instant response (no DB ping) at both `/health` and `/api/health`
- **MongoClient** set to `connect=False` (lazy connection) with timeouts to prevent startup blocking
- **API URL config** centralized in `utils/apiConfig.js` — detects domain mismatch at runtime and falls back to relative URLs to prevent CORS issues from stale deployment secrets
- **.env** cleaned (no comments) to avoid platform parser issues

## Code Quality Improvements (March 2026)
- Console.log replaced with environment-aware logger utility
- Array index keys replaced with stable identifiers
- Python functions refactored for lower cyclomatic complexity
- Test credentials centralized in conftest_credentials.py

## Recherche globale de facteurs — Terminé
- Barre de recherche en haut de la page Data Entry (Fuse.js client-side, lazy loading)
- Toggle "Expert" partagé entre recherche globale et parcours guidé (FactorSelectionStep)
- Fuzzy search sur 6 champs pondérés (nom simplifié FR/DE, nom FR/DE, source, tags)
- Résultats en dropdown avec nom, catégorie, unité, valeur d'impact, badge Expert
- Clic sur résultat → formulaire guidé directement à l'étape 4 (quantité)
- **Résolution hybride de catégorie** : auto-dérivation quand unique, mini-sélecteur quand ambigu
- Scope correctement dérivé depuis `impacts[0].scope` du facteur
- Toggle persisté en localStorage
- Endpoint backend `GET /api/emission-factors/search-index` (8978 facteurs, ~4MB, aggregation avec scope)

## Atelier de Curation — Terminé
- Tableau éditable en ligne (~9000 facteurs, pagination côté serveur)
- Cellules éditables: name_simple_fr, name_simple_de, sous-catégorie, unité, popularité
- Suivi statut curation (À traiter, Traité, Signalé)
- Actions en masse (statut, sous-catégorie, suggestions IA)
- Filtres avancés (texte, statut, visibilité, unité, méthode reporting)
- IA Gemini Pro pour suggestions de titres simplifiés
- Raccourcis clavier (Tab, Enter, Shift+Enter, Escape)
- Dashboard de progression global et par sous-catégorie
- **Colonne "Source BAFU"** (source_product_name) — lecture seule, nom technique ecoinvent
- **Copie en masse** : 4 options de copie vers les noms simplifiés (cellules vides uniquement)
- **Traduction en masse** : 3 options via IA (GPT-4o-mini) avec aperçu et validation
- **FEAT-DR Dual Reporting** : Facteurs tagués Location/Market, liaison market→location via panneau latéral
- **LocationLinkPanel** : Panneau latéral pour lier un facteur market à un facteur location, avec recherche pré-filtrée par sous-catégorie, affichage du nom (pas de l'ID)

## Dual Reporting Dashboard — Terminé (April 2026)
- Toggle Market-based / Location-based propage `reporting_view` à TOUS les endpoints dashboard:
  - `GET /api/dashboard/summary` (existant)
  - `GET /api/dashboard/kpis` (corrigé)
  - `GET /api/dashboard/scope-breakdown/{id}` (corrigé)
  - `GET /api/dashboard/fiscal-comparison` (corrigé)
  - `GET /api/objectives/trajectory` (corrigé)
- Les graphiques Résultats et Objectifs basculent correctement entre market et location

## DB Schema - emission_factors
```
{
  id, name_fr, name_de,
  name_simple_fr (null=non curé, valeur=curé),
  name_simple_de (null=non curé, valeur=curé),
  source_product_name (nom technique ecoinvent),
  subcategory, default_unit, is_public, popularity_score,
  curation_status, impacts[], region, source, year, ...
}
```

## Key Files
- `frontend/src/utils/apiConfig.js` — Centralized API URL config (runtime domain check)
- `frontend/src/pages/CurationWorkbench.jsx` — Page de curation
- `frontend/src/components/curation/LocationLinkPanel.jsx` — Panneau latéral de liaison location
- `frontend/src/pages/Dashboard.js` — Dashboard principal avec toggle dual reporting
- `frontend/src/components/DashboardResultsTab.js` — Onglet Résultats avec graphiques
- `backend/routes/curation.py` — API de curation (incl. copy, translate, search-location)
- `backend/routes/dashboard.py` — API dashboard (summary, kpis, scope-breakdown, fiscal-comparison)
- `backend/routes/objectives.py` — API objectifs SBTi (trajectory, recommendations)
- `backend/services/emissions.py` — Calcul d'émissions (dual reporting)
- `backend/config.py` — MongoDB connection (lazy, with timeouts)
- `backend/server.py` — FastAPI app with health checks at / and /api/health

## API Endpoints
- `GET /health` — Pod health check (instant, no DB)
- `GET /api/health` — Ingress health check (instant, no DB)
- `GET /api/curation/factors` — Liste paginée avec filtres
- `PATCH /api/curation/factors/{id}` — Édition en ligne
- `POST /api/curation/bulk-copy-originals` — Copie originaux → simplifié (FR/DE)
- `POST /api/curation/translate-preview` — Prévisualisation traductions IA
- `POST /api/curation/translate-apply` — Application traductions validées
- `POST /api/curation/bulk-preview` / `bulk-apply` — Actions en masse
- `POST /api/curation/suggest-titles` — Suggestions IA
- `GET /api/curation/stats` — Dashboard progression
- `GET /api/curation/factors/search-location` — Recherche facteurs location (filtre subcategory)
- `GET /api/export/mongodump/info` — Métadonnées DB
- `GET /api/export/mongodump` — Téléchargement dump
- `POST /api/auth/login` — Authentification
- `GET /api/dashboard/summary` — Résumé (reporting_view)
- `GET /api/dashboard/kpis` — KPIs (reporting_view)
- `GET /api/dashboard/scope-breakdown/{id}` — Breakdown scopes (reporting_view)
- `GET /api/dashboard/fiscal-comparison` — Comparaison exercices (reporting_view)
- `GET /api/objectives/trajectory` — Trajectoire SBTi (reporting_view)

## Backlog
### P0
- **FEAT-CUR-03 — Regroupement par patterns**: Vue qui groupe les facteurs similaires pour corrections en masse rapides

### P1
- **FEAT-03 — Multi-utilisateurs**: Rôles Admin/Éditeur/Lecteur
- **Exports PDF/Excel**
- **FEAT-PLAUS — Test de plausibilité global**

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB (projections MongoDB dans dashboard.py)
- Refactoring composants React monolithiques (GuidedEntryModal.js, Dashboard.js, AdminFactorsTab.jsx, CurationWorkbench.jsx)

## Credentials
- Email: newtest@x.com / Password: test123
