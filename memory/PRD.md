# Proto Carbon - Calculateur d'Empreinte Carbone

## Problem Statement
Application full-stack (React/FastAPI/MongoDB) pour la comptabilité carbone d'entreprise suivant le GHG Protocol. Inclut un calculateur d'émissions, un panneau d'administration avancé, des interfaces de saisie de données modernisées et un Atelier de Curation pour gérer ~9000 facteurs d'émission.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + MongoDB, port 8001
- **Integrations**: Gemini Pro / GPT-4o-mini via emergentintegrations (suggestions IA + traductions)

## Core Features Implemented
- Auth (localStorage + JWT Bearer Token)
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

## Admin Factors Form — Réorganisé (April 2026)
- **Noms simplifiés FR/DE** en position principale (ce sont les noms affichés dans l'app)
- **source_product_name** : nouveau champ éditable (nom technique BAFU/ecoinvent)
- **Noms techniques (name_fr/name_de)** : section repliable "Noms techniques (import)"
- **reporting_method** : sélecteur Location / Market / Non défini
- **popularity_score** : slider 0-100 (Rare → Courant)
- Tableau liste : affiche source_product_name en sous-titre + badge reporting_method
- Modèles Pydantic backend mis à jour (EmissionFactorV2Create/Update)

## Recommandations Dashboard — Supprimées (April 2026)
- Bloc "Mesures recommandées" retiré de l'onglet Objectifs (obsolète)
- Appel API /api/objectives/recommendations supprimé du frontend

## Key Files
- `frontend/src/pages/Dashboard.js` — Dashboard principal
- `frontend/src/components/admin/AdminFactorsTab.jsx` — Formulaire facteurs restructuré
- `backend/routes/plausibility.py` — POST /check endpoint
- `backend/services/plausibility.py` — 11 règles métier
- `backend/routes/dashboard.py` — API dashboard (reporting_view sur tous endpoints)
- `backend/routes/objectives.py` — API objectifs SBTi
- `backend/models/__init__.py` — Modèles Pydantic (source_product_name, reporting_method ajoutés)

## API Endpoints
- `POST /api/plausibility/check` — Diagnostic de plausibilité
- `PUT /api/admin/emission-factors-v2/{id}` — Mise à jour facteur (accepte source_product_name, reporting_method, name_simple_fr/de, popularity_score)
- `GET /api/dashboard/summary|kpis|scope-breakdown|fiscal-comparison` — reporting_view
- `GET /api/objectives/trajectory` — reporting_view

## Backlog
### P0
- **FEAT-CUR-03 — Regroupement par patterns**: Vue qui groupe les facteurs similaires

### P1
- **FEAT-03 — Multi-utilisateurs**: Rôles Admin/Éditeur/Lecteur
- **Exports PDF/Excel**

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB
- Refactoring composants React monolithiques

## Credentials
- Email: newtest@x.com / Password: test123
