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
│   └── auth.py            # Routes authentification (exemple)
├── services/
│   ├── __init__.py        # Exports des services
│   ├── auth.py            # Service authentification (JWT, password)
│   └── emissions.py       # Service calcul d'émissions
├── utils/
│   └── __init__.py        # Fonctions utilitaires (serialize_doc, etc.)
└── tests/                 # Tests unitaires (à créer)
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
toutes les routes. La migration vers les modules se fait progressivement :

1. ✅ **Phase 1** : Créer la structure de base (config, models, utils, services)
2. 🔄 **Phase 2** : Migrer les routes une par une vers `routes/`
3. ⏳ **Phase 3** : Refactorer `server.py` pour n'être qu'un assembleur

## Avantages de cette architecture

- **Séparation des responsabilités** : Chaque fichier a un rôle clair
- **Testabilité** : Les services peuvent être testés unitairement
- **Maintenabilité** : Plus facile de trouver et modifier le code
- **Réutilisabilité** : Les services peuvent être utilisés dans plusieurs routes
