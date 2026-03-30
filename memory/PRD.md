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
- Saisie de données (slide-over) + **Recherche globale de facteurs** (Fuse.js, toggle Expert)
- Gestion de produits (slide-over)
- Administration
- Facteurs d'émission avec grille/tableau
- Exercices fiscaux
- **Atelier de Curation (Phase 1 & 2)** — feature majeure
- **Vue tabulaire détaillée** : Slide-over panel pour activités par scope (Facteur, %, Source, Commentaire)

## Recherche globale de facteurs — Terminé
- Barre de recherche en haut de la page Data Entry (Fuse.js client-side, lazy loading)
- Toggle "Expert" partagé entre recherche globale et parcours guidé (FactorSelectionStep)
- Fuzzy search sur 6 champs pondérés (nom simplifié FR/DE, nom FR/DE, source, tags)
- Résultats en dropdown avec nom, catégorie, unité, valeur d'impact, badge Expert
- Clic sur résultat → formulaire guidé directement à l'étape 4 (quantité)
- **Résolution hybride de catégorie** : auto-dérivation quand unique, mini-sélecteur quand ambigu (89/100 sous-catégories ont 2+ catégories)
- Scope correctement dérivé depuis `impacts[0].scope` du facteur
- Toggle persisté en localStorage
- Endpoint backend `GET /api/emission-factors/search-index` (8978 facteurs, ~4MB, aggregation avec scope)

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
- **Traduction en masse** : 3 options via IA (GPT-4o-mini) avec aperçu et validation :
  - "Traduire FR → DE" — traduit name_simple_fr vers name_simple_de
  - "Source+Trad → FR" — traduit et simplifie source_product_name (anglais ecoinvent) vers français
  - "Source+Trad → DE" — traduit et simplifie source_product_name (anglais ecoinvent) vers allemand

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
- **FEAT-DR — Dual Reporting (Location-based / Market-based)**: Gestion du double reporting pour le Scope 2 selon le GHG Protocol — approche basée sur la localisation vs. approche basée sur le marché (certificats d'énergie, contrats, mix résiduel)
- **FEAT-PLAUS — Test de plausibilité global**: Vérification automatique de la cohérence des volumes saisis par rapport aux informations générales de l'entreprise (effectifs, surface, chiffre d'affaires, secteur d'activité). Alertes si les données semblent incohérentes

### P2
- Base de données actions plan climat cantonal
- Logs d'audit calculs d'émission
- Optimisation requêtes DB (projections MongoDB dans dashboard.py)

## Credentials
- Email: newtest@x.com / Password: test123
