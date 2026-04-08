# Infrastructure — ProtoCarbon FR

## Architecture générale

## Serveur

| Paramètre | Valeur |
|-----------|--------|
| Hébergeur | Infomaniak |
| Localisation | Plan-les-Ouates, Suisse 🇨🇭 |
| IP | 83.228.236.89 |
| OS | Ubuntu (Managed) |
| Offre | Serveur Cloud 4 vCPU / 12 Go RAM / 250 Go |
| Nom d'hôte | od-0c4c61 |
| Domaine | carbonscope.watted.ch |

## Accès

### Console SSH (navigateur)
Dashboard Infomaniak → Hébergement → carbonscope → SSH

### FTP/SSH
- Host : `83.228.236.89`
- Port : `22`
- User : `castella`

## Structure des fichiers sur le serveur

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

⚠️ Le port 27017 est ouvert uniquement pour les IPs autorisées dans le firewall Infomaniak.

## Déploiement automatique

### Workflow

### Durée
~27 secondes. FastAPI reste actif pendant le build React.

### Webhook
- URL : `https://carbonscope.watted.ch/deploy`
- Secret : dans `~/webhook.py`
- Processus : `webhook.py` tourne sur le port 9000

### Déploiement manuel
```bash
bash /home/clients/72224a48068d145a512bd618b3cc802e/deploy.sh
```

## Mise à jour de la base de données (depuis un dump Emergent)

1. Déposer le fichier `.zip` dans la racine via WebFTP
2. Lancer :
```bash
bash /home/clients/72224a48068d145a512bd618b3cc802e/update_db.sh
```

## Variables d'environnement backend

Fichier : `~/protocarbon_fr/backend/.env`

## Tâches planifiées (crontab)

```bash
crontab -l
```

| Tâche | Schedule | Description |
|-------|----------|-------------|
| FastAPI | `@reboot` | Démarre uvicorn au reboot |
| Backup MongoDB | `0 3 * * *` | Chaque nuit à 3h |

## Processus en cours

### Vérifier que FastAPI tourne
```bash
cat ~/uvicorn.log | tail -5
```

### Redémarrer FastAPI manuellement
```bash
pkill -f uvicorn
cd ~/protocarbon_fr/backend
nohup python3 -m uvicorn server:app --host 127.0.0.1 --port 8001 > ~/uvicorn.log 2>&1 &
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


- [ ] Environnement staging (`staging.carbonscope.watted.ch`)
- [ ] Configurer git (nom, email, pull.rebase false)
- [ ] Sécuriser les credentials git (`~/.git-credentials`)
- [ ] Notifications email en cas d'échec déploiement/backup
- [ ] Monitoring FastAPI
- [ ] Migration scripts `enrich_*.py`
- [ ] SMTP emails transactionnels
