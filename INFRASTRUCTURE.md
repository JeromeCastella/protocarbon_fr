# Infrastructure — ProtoCarbon FR

## Architecture générale

```
Utilisateur → carbonscope.watted.ch (Apache)
                    ↓
            React (frontend/build/)
                    ↓
            /api/* → FastAPI prod (port 8001)
                    ↓
            MongoDB (port 27017)

Développeur → staging.carbonscope.watted.ch (Apache)
                    ↓
            React (frontend/build_staging/)
                    ↓
            /api/* → FastAPI staging (port 8002)
                    ↓
            MongoDB (port 27017) — même base
```

## Workflow de développement

```
feature/xxx → staging → staging.carbonscope.watted.ch (test)
                      ↓ si ok
              main → carbonscope.watted.ch (prod)
```

## Serveur

| Paramètre | Valeur |
|-----------|--------|
| Hébergeur | Infomaniak |
| Localisation | Plan-les-Ouates, Suisse 🇨🇭 |
| IP | 83.228.236.89 |
| OS | Ubuntu (Managed) |
| Offre | Serveur Cloud 4 vCPU / 12 Go RAM / 250 Go |
| Nom d'hôte | od-0c4c61 |
| Domaine prod | carbonscope.watted.ch |
| Domaine staging | staging.carbonscope.watted.ch |

## Accès

### Console SSH (navigateur)
Dashboard Infomaniak → Hébergement → carbonscope → SSH

### FTP/SSH
- Host : `83.228.236.89`
- Port : `22`
- User : `castella`

## Structure des fichiers sur le serveur

```
/home/clients/72224a48068d145a512bd618b3cc802e/
├── protocarbon_fr/              # Repo production (branche main)
│   ├── backend/
│   │   ├── .env                 # Variables d'environnement (ne pas commiter !)
│   │   └── server.py
│   └── frontend/
│       ├── build/               # React buildé prod (servi par Apache)
│       └── build_staging/       # React buildé staging (servi par Apache)
├── protocarbon_fr_staging/      # Repo staging (branche staging)
│   ├── backend/
│   └── frontend/
├── mongo_backups/               # Backups MongoDB (7 jours)
├── backups/                     # Backups Infomaniak (automatiques)
├── deploy.sh                    # Script déploiement prod
├── deploy_staging.sh            # Script déploiement staging
├── backup_mongo.sh              # Script backup MongoDB
├── update_db.sh                 # Script import dump MongoDB
├── webhook.py                   # Serveur webhook GitHub (port 9000)
├── deploy.log                   # Logs déploiement prod
├── deploy_staging.log           # Logs déploiement staging
├── backup.log                   # Logs backup
├── uvicorn.log                  # Logs FastAPI prod
└── uvicorn_staging.log          # Logs FastAPI staging
```

## MongoDB

| Paramètre | Valeur |
|-----------|--------|
| Version | 7.0.31 |
| Port | 27017 (local uniquement) |
| Base | carbon_tracker |
| User admin | carbon_admin |
| Auth | Activée |
| Backups | Chaque nuit à 3h, 7 jours conservés |

### Connexion locale (depuis le serveur)
```bash
mongosh -u carbon_admin -p --authenticationDatabase admin
```

### Connexion depuis Compass (externe)
```
mongodb://carbon_admin:PASSWORD@83.228.236.89:27017/carbon_tracker?authSource=admin
```
⚠️ Le port 27017 est ouvert uniquement pour les IPs autorisées dans le firewall Infomaniak.

## Déploiement automatique

### Workflow
```
Push sur main    → GitHub webhook → deploy.sh         → prod
Push sur staging → GitHub webhook → deploy_staging.sh → staging
```

### Durée
~27 secondes. FastAPI reste actif pendant le build React.

### Webhook
- URL : `https://carbonscope.watted.ch/deploy`
- Secret : dans `~/webhook.py`
- Processus : `webhook.py` tourne sur le port 9000
- `STAGING_READY = True` dans `webhook.py` pour activer le staging

### Déploiement manuel prod
```bash
bash /home/clients/72224a48068d145a512bd618b3cc802e/deploy.sh
```

### Déploiement manuel staging
```bash
bash /home/clients/72224a48068d145a512bd618b3cc802e/deploy_staging.sh
```

## Mise à jour de la base de données (depuis un dump Emergent)

1. Déposer le fichier `.zip` dans la racine via WebFTP
2. Lancer :
```bash
bash /home/clients/72224a48068d145a512bd618b3cc802e/update_db.sh
```

## Variables d'environnement backend

Fichier : `~/protocarbon_fr/backend/.env`

```
MONGO_URL=mongodb://carbon_admin:PASSWORD@127.0.0.1:27017/carbon_tracker?authSource=admin
DB_NAME=carbon_tracker
JWT_SECRET=...
OPENAI_API_KEY=sk-...
CORS_ORIGINS=https://carbonscope.watted.ch
FRONTEND_URL=https://carbonscope.watted.ch
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

## Tâches planifiées (crontab)

```bash
crontab -l
```

| Tâche | Schedule | Description |
|-------|----------|-------------|
| FastAPI prod | `@reboot` | Démarre uvicorn port 8001 au reboot |
| FastAPI staging | `@reboot` | Démarre uvicorn port 8002 au reboot |
| Backup MongoDB | `0 3 * * *` | Chaque nuit à 3h, 7 jours conservés |

## Processus en cours

### Vérifier que FastAPI prod tourne
```bash
cat ~/uvicorn.log | tail -5
```

### Vérifier que FastAPI staging tourne
```bash
cat ~/uvicorn_staging.log | tail -5
```

### Redémarrer FastAPI prod manuellement
```bash
pkill -f uvicorn
cd ~/protocarbon_fr/backend
nohup python3 -m uvicorn server:app --host 127.0.0.1 --port 8001 > ~/uvicorn.log 2>&1 &
```

### Redémarrer FastAPI staging manuellement
```bash
pkill -f uvicorn
cd ~/protocarbon_fr_staging/backend
nohup python3 -m uvicorn server:app --host 127.0.0.1 --port 8002 > ~/uvicorn_staging.log 2>&1 &
```

### Vérifier que le webhook tourne
```bash
ps aux | grep webhook
```

### Redémarrer le webhook
```bash
pkill -f webhook.py
nohup python3 ~/webhook.py > ~/webhook.log 2>&1 &
```

## Backlog


- [ ] Configurer git sur le serveur (nom, email, pull.rebase false)
- [ ] Sécuriser les credentials git (`~/.git-credentials`)
- [ ] Notifications email en cas d'échec déploiement/backup
- [ ] Monitoring FastAPI
- [ ] Migration scripts `enrich_*.py`
- [ ] SMTP emails transactionnels