# Documentation Technique — Protocarbon

> Version : Mars 2026
> Stack : FastAPI + MongoDB + React 18

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Base de données](#5-base-de-données)
6. [Modèles de données](#6-modèles-de-données)
7. [API Reference](#7-api-reference)
8. [Frontend](#8-frontend)
9. [Authentification](#9-authentification)
10. [Logique métier](#10-logique-métier)
11. [Variables d'environnement](#11-variables-denvironnement)

---

## 1. Vue d'ensemble

**Protocarbon** est un outil SaaS de calcul d'empreinte carbone conforme au **GHG Protocol** (Greenhouse Gas Protocol). Il permet à des entreprises de :

- Saisir leurs activités génératrices d'émissions (Scope 1, 2, 3 amont et aval)
- Gérer des exercices fiscaux annuels avec clôture, rectification et duplication
- Modéliser le cycle de vie complet de produits vendus (matériaux → transformation → usage → fin de vie)
- Visualiser un bilan carbone agrégé par scope et par catégorie

L'application est **multi-tenant** : chaque utilisateur est isolé par un `tenant_id`. Une entreprise = un compte = un utilisateur (architecture mono-utilisateur à date).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                React 18 SPA (port 3000)                 │
│   React Router v6 │ Axios │ Context API │ Tailwind CSS  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON (proxy → :8001)
┌────────────────────────▼────────────────────────────────┐
│                 Backend FastAPI (port 8001)              │
│   APIRouter /api │ JWT Auth │ Pydantic │ PyMongo         │
└────────────────────────┬────────────────────────────────┘
                         │ PyMongo (MONGO_URL)
┌────────────────────────▼────────────────────────────────┐
│                  MongoDB (carbon_tracker)                │
│  users │ companies │ activities │ fiscal_years │         │
│  products │ emission_factors │ categories │ subcategories│
└─────────────────────────────────────────────────────────┘
```

Le frontend React proxifie toutes les requêtes `/api/*` vers le backend FastAPI. Il n'y a pas de couche BFF ni de gateway.

---

## 3. Stack technique

### Backend
| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework API | FastAPI | ~0.104 |
| Base de données | MongoDB | - |
| Driver DB | PyMongo | synchrone |
| Authentification | JWT (python-jose) | HS256 |
| Hachage mot de passe | passlib (bcrypt) | - |
| Validation | Pydantic v2 | - |
| Serveur ASGI | Uvicorn | - |

### Frontend
| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework UI | React | 18.2 |
| Routage | React Router | v6.20 |
| Requêtes HTTP | Axios | - |
| Styles | Tailwind CSS | - |
| Composants | Radix UI | - |
| Icônes | Lucide React | - |
| Animations | Framer Motion | - |
| Graphiques | Recharts | - |

---

## 4. Structure du projet

```
protocarbon_fr/
├── backend/
│   ├── server.py              # Application FastAPI complète (routes, modèles, logique)
│   ├── requirements.txt
│   └── tests/
│       ├── test_carbon_api.py
│       └── test_product_lifecycle.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js             # Routeur principal
│   │   ├── pages/
│   │   │   ├── AuthPage.js
│   │   │   ├── Dashboard.js
│   │   │   ├── DataEntry.js
│   │   │   ├── EmissionFactors.js
│   │   │   ├── FiscalYears.js
│   │   │   ├── GeneralInfo.js
│   │   │   └── Products.js
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   ├── FiscalYearSelector.js
│   │   │   ├── GuidedEntryModal.js
│   │   │   ├── ProductWizard.js
│   │   │   └── ProductSaleModal.js
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   ├── FiscalYearContext.js
│   │   │   ├── LanguageContext.js
│   │   │   └── ThemeContext.js
│   │   └── locales/
│   │       ├── fr.json
│   │       └── de.json
│   ├── package.json
│   └── tailwind.config.js
│
└── docs/
```

---

## 5. Base de données

Base de données : **MongoDB**, nom par défaut `carbon_tracker`.

### Collections

#### `users`
Comptes utilisateurs. Un utilisateur = un tenant.

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Identifiant MongoDB |
| `email` | string (unique) | Email de connexion |
| `password` | string | Mot de passe haché (bcrypt) |
| `name` | string | Nom affiché |
| `language` | string | Préférence de langue (`fr` / `de`) |
| `company_id` | string? | Référence vers la société |
| `created_at` | datetime | Date de création |

#### `companies`
Informations de la société, une par tenant.

| Champ | Type | Description |
|-------|------|-------------|
| `tenant_id` | string | ID de l'utilisateur propriétaire |
| `name` | string | Raison sociale |
| `location` | string | Localisation |
| `sector` | string | Secteur d'activité |
| `reference_year` | int | Année de référence du bilan |
| `employees` | int | Nombre d'employés |
| `surface_area` | float | Surface en m² |
| `revenue` | float | Chiffre d'affaires |
| `consolidation_approach` | string | Approche de consolidation (contrôle opérationnel / financier) |
| `excluded_categories` | string[] | Codes de catégories exclues du bilan |
| `fiscal_year_start_month` | int | Mois de début de l'exercice (défaut : 1) |
| `fiscal_year_start_day` | int | Jour de début (défaut : 1) |

#### `activities`
Activités génératrices d'émissions. C'est la collection centrale du bilan.

| Champ | Type | Description |
|-------|------|-------------|
| `tenant_id` | string | ID utilisateur (isolation multi-tenant) |
| `company_id` | string | ID société |
| `fiscal_year_id` | string? | Exercice rattaché explicitement |
| `category_id` | string | Code de catégorie GHG (ex: `combustion_mobile`) |
| `subcategory_id` | string? | Sous-catégorie |
| `scope` | string | `scope1` / `scope2` / `scope3_amont` / `scope3_aval` |
| `name` | string | Libellé de l'activité |
| `description` | string? | Description libre |
| `quantity` | float | Quantité saisie |
| `unit` | string | Unité (ex: `km`, `kWh`, `kg`) |
| `emission_factor_id` | string? | Référence vers un FE de la base |
| `manual_emission_factor` | float? | FE saisi manuellement (kgCO₂e/unité) |
| `emissions` | float | Émissions calculées (gCO₂e) |
| `date` | date? | Date de l'activité |
| `source` | string? | Source de la donnée |
| `comments` | string? | Commentaires libres |
| `linked_group_id` | string? | Relie les activités multi-scope issues d'un même FE |
| `product_id` | string? | Présent si créé via vente produit |
| `product_name` | string? | Nom du produit source |
| `created_at` | datetime | |

#### `fiscal_years`
Exercices fiscaux. Cycle de vie : `draft` → `closed` → `rectified`.

| Champ | Type | Description |
|-------|------|-------------|
| `tenant_id` | string | |
| `company_id` | string | |
| `name` | string | Libellé (ex: "Exercice 2025") |
| `start_date` | date | Début de période |
| `end_date` | date | Fin de période |
| `status` | string | `draft` / `closed` / `rectified` |
| `summary` | object? | Bilan calculé à la clôture (voir §10) |
| `closed_at` | datetime? | |
| `closed_by` | string? | ID utilisateur |
| `rectifications` | object[] | Historique des rectifications (raison, date, résumé précédent) |
| `duplicated_from` | string? | ID de l'exercice source |

#### `products`
Fiches produits avec données cycle de vie.

| Champ | Type | Description |
|-------|------|-------------|
| `tenant_id` | string | |
| `name` | string | Nom du produit |
| `product_type` | string | `finished` / `semi_finished` |
| `unit` | string | Unité de vente |
| `lifespan_years` | float | Durée de vie en années |
| `materials` | object[] | Composition matériaux (nom, poids, traitement fin de vie) |
| `transformation` | object? | Énergie de transformation (kWh élec/fuel par unité) |
| `usage` | object? | Énergie d'utilisation (kWh/cycle, cycles/an) |
| `transformation_emissions` | float | kgCO₂e/unité — phase transformation |
| `usage_emissions` | float | kgCO₂e/unité — phase utilisation |
| `disposal_emissions` | float | kgCO₂e/unité — fin de vie |
| `total_emissions_per_unit` | float | Somme des 3 phases |
| `sales` | object[] | Historique des ventes enregistrées |
| `is_enhanced` | bool | `true` pour les fiches cycle de vie complètes |

#### `emission_factors`
Base de données des facteurs d'émission (FE).

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Libellé du FE |
| `category` | string | Catégorie GHG associée |
| `scope` | string | Scope cible |
| `value` | float | Valeur en kgCO₂e/unité |
| `unit` | string | Unité du dénominateur |
| `source` | string | Source (ex: `ADEME Base Carbone`, `GIEC`) |
| `tags` | string[] | Mots-clés de recherche |
| `region` | string? | Région géographique |
| `year` | int? | Année de référence |

#### `categories`
Référentiel des catégories d'émissions, organisées par scope GHG Protocol.

Exemples de codes : `combustion_mobile`, `combustion_fixe`, `electricite`, `biens_services_achetes`, `transformation_produits`, `utilisation_produits`, `fin_vie_produits`.

#### `subcategories`
Sous-catégories rattachées à une catégorie parente. Utilisées pour la saisie guidée et la recherche de FE.

---

## 6. Modèles de données

### Authentification
```python
UserRegister:   email, password, name, language="fr"
UserLogin:      email, password
UserResponse:   id, email, name, language, company_id, created_at
```

### Société
```python
CompanyCreate:  name, location, sector, reference_year, employees,
                surface_area, revenue, consolidation_approach,
                excluded_categories=[], fiscal_year_start_month=1,
                fiscal_year_start_day=1
CompanyUpdate:  tous les champs de CompanyCreate (optionnels)
```

### Exercices fiscaux
```python
FiscalYearCreate:    name, start_date, end_date
FiscalYearRectify:   reason (str, ≥10 caractères)
FiscalYearDuplicate: new_name, new_start_date, new_end_date,
                     duplicate_activities=False,
                     activity_ids_to_duplicate=[]
```

### Activités
```python
ActivityCreate: category_id, scope, name, description?, quantity,
                unit, emission_factor_id?, manual_emission_factor?,
                date?, source?, comments?, fiscal_year_id?,
                subcategory_id?
ActivityUpdate: tous les champs optionnels
```

### Produits (cycle de vie)
```python
MaterialComposition:    material_name, weight_kg, treatment_type,
                        emission_factor_id?, recyclability_percent=0
TransformationEnergy:   electricity_kwh=0, electricity_factor_id?,
                        fuel_kwh=0, fuel_factor_id?, region="France"
UsageEnergy:            electricity_kwh_per_cycle, fuel_kwh_per_cycle,
                        carburant_l_per_cycle, refrigerant_kg_per_cycle,
                        cycles_per_year=1
ProductCreateEnhanced:  name, description?, product_type="finished",
                        unit="unit", lifespan_years=1,
                        materials[], transformation?, usage?
```

---

## 7. API Reference

Toutes les routes sont préfixées `/api`. Les routes protégées requièrent un header :
```
Authorization: Bearer <JWT_TOKEN>
```

### Authentification — `/api/auth`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/register` | Non | Création de compte |
| POST | `/auth/login` | Non | Connexion, retourne le JWT |
| GET | `/auth/me` | Oui | Profil de l'utilisateur courant |
| PUT | `/auth/language` | Oui | Mise à jour de la langue |

### Société — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/companies` | Oui | Créer la fiche société |
| GET | `/companies` | Oui | Lire la fiche société |
| PUT | `/companies/{id}` | Oui | Mettre à jour la fiche société |

### Référentiel — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/categories` | Non | Toutes les catégories par scope |
| GET | `/subcategories?category=` | Non | Sous-catégories d'une catégorie |
| GET | `/emission-factors` | Non | Tous les facteurs d'émission |
| GET | `/emission-factors/search` | Non | Recherche par sous-catégorie / unité / nom |
| GET | `/emission-factors/by-category/{cat}` | Non | FE par catégorie |
| GET | `/emission-factors/by-tags?tags=` | Non | FE par tags (virgule-séparés) |
| POST | `/emission-factors` | Oui | Créer un FE personnalisé |

### Activités — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/activities` | Oui | Créer une activité (supporte multi-scope) |
| GET | `/activities?scope=&category_id=` | Oui | Lister les activités avec filtres |
| PUT | `/activities/{id}` | Oui | Modifier (recalcule les émissions) |
| DELETE | `/activities/{id}` | Oui | Supprimer |

### Produits — `/api/products`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/products/enhanced` | Oui | Créer une fiche produit cycle de vie |
| GET | `/products` | Oui | Lister les fiches produits |
| GET | `/products/{id}` | Oui | Détail d'une fiche produit |
| PUT | `/products/enhanced/{id}` | Oui | Mettre à jour une fiche produit |
| DELETE | `/products/{id}` | Oui | Supprimer |
| POST | `/products/{id}/sales/enhanced` | Oui | Enregistrer une vente → génère activités Scope 3 Aval |

### Exercices fiscaux — `/api/fiscal-years`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/fiscal-years` | Oui | Lister les exercices |
| GET | `/fiscal-years/current` | Oui | Exercice actif courant |
| GET | `/fiscal-years/{id}` | Oui | Détail d'un exercice |
| POST | `/fiscal-years` | Oui | Créer un exercice |
| POST | `/fiscal-years/{id}/close` | Oui | Clôturer (calcule le résumé, verrouille) |
| POST | `/fiscal-years/{id}/rectify` | Oui | Rouvrir avec justification |
| POST | `/fiscal-years/{id}/duplicate` | Oui | Dupliquer avec option copie des activités |
| GET | `/fiscal-years/{id}/activities` | Oui | Activités de l'exercice |
| GET | `/fiscal-years/{id}/activities-for-duplication` | Oui | Activités groupées par catégorie (sélection) |

### Dashboard — `/api/dashboard`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/dashboard/summary` | Oui | Total émissions par scope + taux de complétion |
| GET | `/dashboard/category-stats` | Oui | Nombre d'activités par catégorie |

### Import / Export — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/import/csv` | Oui | Importer des activités depuis un CSV |
| GET | `/export/csv` | Oui | Exporter les activités en CSV |
| GET | `/export/json` | Oui | Export complet (société + activités + produits) |
| POST | `/import/json` | Oui | Importer un export JSON complet |

---

## 8. Frontend

### Routage

```
/auth                   → AuthPage       (public)
/                       → Dashboard      (protégé)
/general-info           → GeneralInfo    (protégé)
/data-entry             → DataEntry      (protégé)
/products               → Products       (protégé)
/emission-factors       → EmissionFactors(protégé)
/fiscal-years           → FiscalYears    (protégé)
```

Les routes protégées redirigent vers `/auth` si aucun token JWT n'est présent en localStorage.

### Pages

| Page | Responsabilité |
|------|---------------|
| `AuthPage.js` | Formulaires d'inscription et de connexion. Sélection de la langue initiale. |
| `Dashboard.js` | KPIs agrégés (total tCO₂e, par scope). Graphiques de répartition et de complétion. Top 10 sous-catégories. Tendances sur les exercices. |
| `GeneralInfo.js` | Fiche société (secteur, effectifs, surface, CA). Configuration des catégories exclues. Paramétrage du démarrage de l'exercice fiscal. |
| `DataEntry.js` | Saisie des activités par catégorie GHG. Tableau de consultation et d'édition. Import CSV. Redirection vers ProductSaleModal pour le Scope 3 Aval. |
| `Products.js` | Gestion des fiches produits. Lancement du ProductWizard. Enregistrement des ventes. |
| `EmissionFactors.js` | Consultation et recherche dans la base de FE. Création de FE personnalisés. |
| `FiscalYears.js` | Création, clôture, rectification et duplication des exercices fiscaux. |

### Composants clés

| Composant | Responsabilité |
|-----------|---------------|
| `Layout.js` | Shell de l'application : sidebar, header, thème clair/sombre. |
| `FiscalYearSelector.js` | Dropdown de sélection de l'exercice actif. Partagé dans le header. |
| `GuidedEntryModal.js` | Modal de saisie d'activité : choix de la sous-catégorie, recherche de FE, saisie quantité. |
| `ProductWizard.js` | Wizard 5 étapes pour créer/éditer une fiche produit avec cycle de vie complet. |
| `ProductSaleModal.js` | Modal d'enregistrement d'une vente. Sélectionne un produit existant, saisit la quantité, déclenche la génération d'activités Scope 3 Aval. |

### Gestion d'état (Context API)

| Context | Rôle |
|---------|------|
| `AuthContext` | Token JWT, profil utilisateur, login / logout. Initialise l'en-tête Axios. |
| `FiscalYearContext` | Liste des exercices, exercice sélectionné, CRUD exercices. |
| `LanguageContext` | Langue active (FR/DE), fonction de traduction `t()`, chargement des fichiers `locales/`. |
| `ThemeContext` | Mode clair/sombre, persistance en localStorage. |

---

## 9. Authentification

### Flux d'inscription
```
1. POST /api/auth/register { email, password, name, language }
2. Hachage du mot de passe (bcrypt)
3. Création document users
4. Génération JWT (sub: user_id, exp: now + ACCESS_TOKEN_EXPIRE_MINUTES)
5. Retour { token, user }
6. Frontend : stockage token dans localStorage
7. Axios : header Authorization: Bearer {token}
```

### Flux de connexion
```
1. POST /api/auth/login { email, password }
2. Récupération utilisateur par email
3. Vérification mot de passe (bcrypt.verify)
4. Génération JWT
5. Retour { token, user }
```

### Protection des routes backend
```python
# Dépendance FastAPI
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    user_id = payload.get("sub")
    user = db["users"].find_one({"_id": ObjectId(user_id)})
    return user
```

Toutes les routes protégées injectent `current_user` via cette dépendance. Le `tenant_id` utilisé dans les requêtes MongoDB est systématiquement `str(current_user["_id"])`.

---

## 10. Logique métier

### Calcul des émissions d'une activité

```
emissions (kgCO₂e) = quantity × emission_factor_value
```

- Si `emission_factor_id` fourni : le FE est récupéré depuis la collection `emission_factors`.
- Si `manual_emission_factor` fourni : utilisé directement.
- Les émissions sont stockées en **gCO₂e** dans la collection `activities` (×1000 pour la conversion).

#### Facteurs d'émission multi-scope
Un FE peut avoir plusieurs "impacts" (ex. un achat qui génère des émissions Scope 3 amont ET Scope 2). Dans ce cas, le backend crée **une activité par impact**, toutes liées par un `linked_group_id`.

### Calcul du cycle de vie produit (fiche produit)

**Phase Transformation** (semi-finished uniquement) :
```
transformation_emissions =
  (electricity_kwh × electricity_factor)
  + (fuel_kwh × fuel_factor)

Facteurs par défaut : électricité France = 0.0569 kgCO₂e/kWh
                      fuel = 0.205 kgCO₂e/kWh
```

**Phase Utilisation** :
```
total_cycles = lifespan_years × cycles_per_year

usage_emissions =
  (electricity_kwh_per_cycle × elec_factor × total_cycles)
  + (fuel_kwh_per_cycle × fuel_factor × total_cycles)
  + (carburant_l_per_cycle × carbu_factor × total_cycles)   # diesel : 2.68
  + (refrigerant_kg_per_cycle × refrig_factor × total_cycles) # R-134a : 1430
```

**Phase Fin de vie** :
```
disposal_emissions = Σ (material_weight_kg × treatment_factor)

Exemples : recyclage acier = -1.54 kgCO₂e/kg (crédit)
           incinération   =  0.51 kgCO₂e/kg
           enfouissement  =  0.69 kgCO₂e/kg
```

**Total par unité** :
```
total_emissions_per_unit = transformation + usage + disposal (kgCO₂e/unité)
```

### Enregistrement d'une vente produit

Lors d'un appel à `POST /products/{id}/sales/enhanced`, le backend :
1. Multiplie les émissions par phase par la quantité vendue.
2. Crée automatiquement jusqu'à 3 activités en Scope 3 Aval :
   - `transformation_produits` (si transformation_emissions > 0)
   - `utilisation_produits` (si usage_emissions > 0)
   - `fin_vie_produits` (si disposal_emissions > 0)
3. Enregistre la vente dans `product.sales[]`.

### Duplication d'un exercice fiscal

```
POST /fiscal-years/{id}/duplicate

1. Validation : les nouvelles dates ne chevauchent aucun exercice existant.
2. Création du nouvel exercice (status: draft, duplicated_from: source_id).
3. Si duplicate_activities=true (ou liste d'IDs fournie) :
   Pour chaque activité :
   - Clone tous les champs
   - Nouveau _id généré
   - fiscal_year_id → nouvel exercice
   - duplicated_from → _id original
   - date → start_date du nouvel exercice
4. Retour : nouvel exercice + nombre d'activités dupliquées.
```

### Clôture d'un exercice fiscal

```
POST /fiscal-years/{id}/close

1. Collecte des activités de l'exercice :
   - Liées explicitement : fiscal_year_id = id
   - Liées par date : date ∈ [start_date, end_date] ET fiscal_year_id absent
2. Calcul du résumé :
   total_emissions_tco2e = Σ(emissions) / 1000
   by_scope: { scope1, scope2, scope3_amont, scope3_aval }
   by_category: { category_id: sum }
   activities_count: n
3. Mise à jour : status="closed", closed_at, closed_by, summary.
```

### Rectification d'un exercice

```
POST /fiscal-years/{id}/rectify { reason: "..." }

Prérequis : status == "closed"
1. Validation : reason ≥ 10 caractères.
2. Ajout dans rectifications[] : { reason, reopened_at, previous_summary }.
3. status → "rectified", summary effacé.
```

### Résumé du dashboard

```
GET /dashboard/summary

Pour chaque activité (hors catégories exclues par la société) :
  scope_totals[activity.scope] += activity.emissions

Ajout des ventes produits (Scope 3 Aval) :
  scope_totals["scope3_aval"] += Σ(product.sales.total_emissions)

Complétion par scope :
  percentage = (catégories avec ≥1 activité / total catégories actives) × 100

Retour :
  { total_emissions, scope_emissions, scope_completion,
    activities_count, products_count, excluded_categories }
```

---

## 11. Variables d'environnement

### Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MONGO_URL` | **requis** | URI de connexion MongoDB |
| `DB_NAME` | `carbon_tracker` | Nom de la base de données |
| `JWT_SECRET` | `carbon_tracker_secret_key_2024` | Clé secrète de signature JWT — **à remplacer en production** |
| `JWT_ALGORITHM` | `HS256` | Algorithme JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Durée de vie du token (24h) |

> **Important** : le `JWT_SECRET` par défaut est présent en clair dans le code. Il doit impérativement être surchargé par une variable d'environnement en production.

### Frontend

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | URL de base du backend. Si absent, les requêtes Axios utilisent des chemins relatifs (proxy CRA vers `:8001`). |
