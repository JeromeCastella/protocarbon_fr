# Architecture Backend - Carbon Tracker

## Structure des fichiers

```
/app/backend/
├── server.py              # Point d'entrée (FastAPI app + CORS + health check)
├── config.py              # Configuration et connexion MongoDB
├── models/
│   └── __init__.py        # Modèles Pydantic (User, Activity, EmissionFactor, etc.)
├── routes/
│   ├── __init__.py        # Router principal (67 routes)
│   ├── auth.py            # Authentification (7 routes)
│   ├── companies.py       # Entreprises (4 routes)
│   ├── activities.py      # Activités CRUD + pagination (6 routes)
│   ├── objectives.py      # Objectifs SBTi (5 routes)
│   ├── dashboard.py       # Dashboard KPIs (5 routes)
│   ├── fiscal_years.py    # Exercices fiscaux (9 routes)
│   ├── products.py        # Produits (7 routes)
│   ├── reference_data.py  # Catégories, conversions (8 routes)
│   └── admin.py           # Administration (16 routes)
├── services/
│   ├── __init__.py        # Exports des services
│   ├── auth.py            # JWT, password hashing
│   └── emissions.py       # Calculs d'émissions
├── utils/
│   └── __init__.py        # Fonctions utilitaires
└── tests/
    ├── conftest.py        # Fixtures pytest
    ├── test_auth.py       # Tests auth (7 tests)
    ├── test_emissions.py  # Tests émissions (15 tests)
    └── test_models.py     # Tests modèles (11 tests)
```

## Architecture modulaire (Migration complète ✅)

Le fichier `server.py` a été nettoyé et ne contient plus que :
- L'initialisation de FastAPI
- La configuration CORS
- L'import du routeur modulaire (`routes.api_router`)
- Un endpoint `/health` pour les probes Kubernetes

Toute la logique métier est organisée en modules :
- **config.py** : Connexion DB, variables d'environnement
- **models/** : Modèles Pydantic
- **routes/** : Endpoints API (67 routes)
- **services/** : Logique métier (auth, calculs émissions)
- **utils/** : Fonctions utilitaires (serialisation, formatage)

## Routes (67 total)

| Module | Routes | Description |
|--------|--------|-------------|
| `auth.py` | 7 | Login, register, me, users CRUD |
| `companies.py` | 4 | Company CRUD |
| `activities.py` | 6 | Activities CRUD + bulk + pagination |
| `objectives.py` | 5 | SBTi objectives + trajectory |
| `dashboard.py` | 5 | Summary, KPIs, comparisons |
| `fiscal_years.py` | 9 | FY CRUD, close, rectify, duplicate |
| `products.py` | 7 | Products CRUD + sales |
| `reference_data.py` | 8 | Categories, subcategories, factors |
| `admin.py` | 16 | Admin: factors v2, subcats, conversions |

## Tests unitaires (33 tests)

```bash
# Exécuter tous les tests
cd /app/backend && python -m pytest tests/ -v

# Avec couverture
python -m pytest tests/ --cov=. --cov-report=html
```

## server.py (version nettoyée)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import api_router

app = FastAPI(title="Carbon Footprint Calculator")
app.add_middleware(CORSMiddleware, ...)
app.include_router(api_router)  # Toutes les routes /api/*

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```
