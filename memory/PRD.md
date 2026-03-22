# Proto Carbon - Calculateur d'Empreinte Carbone

## Problem Statement
Application full-stack (React/FastAPI/MongoDB) pour la comptabilité carbone d'entreprise suivant le GHG Protocol. Inclut un calculateur d'émissions, un panneau d'administration avancé, des interfaces de saisie de données modernisées et un Atelier de Curation pour gérer ~9000 facteurs d'émission.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI, port 3000
- **Backend**: FastAPI + MongoDB, port 8001
- **Integrations**: Gemini Pro / GPT-4o-mini via emergentintegrations (suggestions IA + traductions)

## Core Features Implemented
- Auth (email/password)
- Dashboard avec métriques GHG Protocol
- Saisie de données (slide-over)
- Gestion de produits (slide-over)
- Administration
- Facteurs d'émission avec grille/tableau
- Exercices fiscaux
- **Atelier de Curation (Phase 1 & 2)** — feature majeure

## Atelier de Curation — Terminé
- Tableau éditable en ligne (~9000 facteurs, pagination côté serveur)
- Cellules éditables: name_simple_fr, name_simple_de, sous-catégorie, unité, popularité
- Suivi statut curation (À traiter, Traité, Signalé)
- Actions en masse (statut, sous-catégorie, suggestions IA)
- Filtres avancés (texte, statut, visibilité, unité)
- IA Gemini Pro pour suggestions de titres simplifiés
- Raccourcis clavier (Tab, Enter, Shift+Enter, Escape)
- Dashboard de progression global et par sous-catégorie
- **Colonne "Source BAFU"** (source_product_name) — lecture seule, nom technique ecoinvent
- **Copie en masse** : 4 options de copie vers les noms simplifiés (cellules vides uniquement) :
  - "Orig. → FR/DE" — copie name_fr/name_de → name_simple_fr/name_simple_de
  - "Source → FR/DE" — copie source_product_name → name_simple_fr/name_simple_de
- **Traduction en masse** : "Traduire FR → DE" via IA (GPT-4o-mini) avec aperçu et validation

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
- `frontend/src/pages/CurationWorkbench.jsx` — Page de curation
- `backend/routes/curation.py` — API de curation (incl. copy, translate)
- `backend/scripts/migrate_source_product_name.py` — Script de migration

## API Endpoints Curation
- `GET /api/curation/factors` — Liste paginée avec filtres
- `PATCH /api/curation/factors/{id}` — Édition en ligne
- `POST /api/curation/bulk-copy-originals` — Copie originaux → simplifié (FR/DE)
- `POST /api/curation/translate-preview` — Prévisualisation traductions IA
- `POST /api/curation/translate-apply` — Application traductions validées
- `POST /api/curation/bulk-preview` / `bulk-apply` — Actions en masse
- `POST /api/curation/suggest-titles` — Suggestions IA
- `GET /api/curation/stats` — Dashboard progression

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

## Credentials
- Email: newtest@x.com / Password: test123
