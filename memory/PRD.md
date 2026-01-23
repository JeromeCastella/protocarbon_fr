# Proto Carbon - Calculateur d'empreinte carbone GHG Protocol

## Problème Original
Application de calcul d'empreinte carbone selon le protocole GHG avec interface user-friendly, gamification, multi-tenant, multi-langue (FR/DE), mode clair/sombre.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT

## User Personas
1. **Responsable RSE** - Saisit les données carbone de l'entreprise
2. **Consultant carbone** - Gère plusieurs entreprises (multi-tenant)
3. **Direction** - Consulte les rapports et dashboards

## Core Requirements (Static)
- [x] Authentification JWT
- [x] Multi-tenant via tenant_id
- [x] Multi-langue FR/DE
- [x] Mode clair/sombre
- [x] Gamification (barres de progression)
- [x] Structure GHG Protocol (Scope 1, 2, 3 Amont, 3 Aval)

## What's Been Implemented
### 2026-01-23
- **Auth System**: Registration, Login, JWT tokens
- **Dashboard**: Vue d'ensemble avec émissions totales, progression par scope
- **Informations Générales**: Formulaire entreprise + périmètre du bilan (catégories à exclure)
- **Saisie de données**: 22 catégories avec cartes colorées, onglets par scope, modal d'ajout d'activité
- **Produits**: CRUD produits avec émissions fabrication/utilisation/fin de vie, enregistrement de ventes
- **Facteurs d'émission**: Base de données avec tags, recherche, filtrage par scope
- **Import/Export**: CSV et JSON
- **Gamification**: Barres de progression animées, messages d'encouragement
- **UI/UX**: Interface fidèle aux maquettes fournies

## Prioritized Backlog

### P0 - Critical
- [x] MVP fonctionnel

### P1 - High Priority
- [ ] Rapports PDF/Excel exportables
- [ ] Validation des données
- [ ] Graphiques de répartition par scope

### P2 - Medium Priority
- [ ] Historique des bilans par année
- [ ] Comparaison année N vs N-1
- [ ] Notifications de progression

### P3 - Low Priority
- [ ] API externe pour intégration
- [ ] Mode collaboratif multi-utilisateurs par entreprise

## Next Tasks
1. Ajouter page de rapports avec graphiques
2. Implémenter la validation des données
3. Ajouter conversion d'unités automatique
4. Dashboard avec graphiques (pie chart, bar chart)
