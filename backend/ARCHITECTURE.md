# Architecture Backend - Carbon Tracker

## Structure des fichiers

```
/app/backend/
├── server.py              # Point d'entrée principal (FastAPI app)
├── config.py              # Configuration et connexion MongoDB
├── models/
│   └── __init__.py        # Modèles Pydantic (User, Activity, EmissionFactor, etc.)
├── routes/
│   ├── __init__.py        # Router principal + exports
│   ├── auth.py            # Routes authentification
│   ├── companies.py       # Routes entreprises
│   ├── activities.py      # Routes activités (CRUD + pagination)
│   └── objectives.py      # Routes objectifs carbone (SBTi)
├── services/
│   ├── __init__.py        # Exports des services
│   ├── auth.py            # Service authentification (JWT, password)
│   └── emissions.py       # Service calcul d'émissions
├── utils/
│   └── __init__.py        # Fonctions utilitaires (serialize_doc, etc.)
└── tests/
    ├── conftest.py        # Configuration pytest + fixtures
    ├── test_auth.py       # Tests authentification (7 tests)
    ├── test_emissions.py  # Tests calcul émissions (15 tests)
    └── test_models.py     # Tests modèles Pydantic (11 tests)
```

## Comment exécuter les tests

```bash
# Tous les tests unitaires
cd /app/backend && python -m pytest tests/test_auth.py tests/test_emissions.py tests/test_models.py -v

# Un fichier spécifique
python -m pytest tests/test_emissions.py -v

# Avec couverture
python -m pytest tests/ --cov=. --cov-report=html
```

## Comment utiliser les modules

### Imports depuis config.py
```python
from config import (
    db,
    users_collection,
    activities_collection,
    emission_factors_collection,
    # ... autres collections
    JWT_SECRET,
    pwd_context
)
```

### Imports depuis models/
```python
from models import (
    UserRegister,
    UserLogin,
    ActivityCreate,
    EmissionFactorV2Create,
    # ... autres modèles
)
```

### Imports depuis services/
```python
from services import (
    get_current_user,
    require_admin,
    calculate_emissions_for_activity,
    create_factor_snapshot
)
```

### Imports depuis utils/
```python
from utils import (
    serialize_doc,
    serialize_docs,
    format_emissions,
    validate_scope
)
```

## Migration progressive

Le fichier `server.py` reste le point d'entrée principal et contient encore
la majorité des routes. Les nouveaux modules dans `routes/` sont des exemples
de migration :

- ✅ `routes/auth.py` - Authentification (migré)
- ✅ `routes/companies.py` - Entreprises (migré)
- ✅ `routes/activities.py` - Activités avec pagination (migré)
- ✅ `routes/objectives.py` - Objectifs SBTi (migré)
- ⏳ `routes/dashboard.py` - Dashboard (à migrer)
- ⏳ `routes/admin.py` - Administration (à migrer)

## Tests unitaires

| Fichier | Tests | Description |
|---------|-------|-------------|
| `test_auth.py` | 7 | Password hashing, JWT tokens |
| `test_emissions.py` | 15 | Calcul émissions, conversions, snapshots |
| `test_models.py` | 11 | Validation Pydantic |
| **Total** | **33** | |

## Avantages de cette architecture

- **Séparation des responsabilités** : Chaque fichier a un rôle clair
- **Testabilité** : Les services peuvent être testés unitairement
- **Maintenabilité** : Plus facile de trouver et modifier le code
- **Réutilisabilité** : Les services peuvent être utilisés dans plusieurs routes
