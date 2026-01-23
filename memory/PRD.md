# Proto Carbon - Calculateur d'empreinte carbone GHG Protocol

## Problème Original
Application de calcul d'empreinte carbone selon le protocole GHG avec interface user-friendly, gamification, multi-tenant, multi-langue (FR/DE), mode clair/sombre.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI (Python) avec routes préfixées `/api`
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
### 2026-01-23 (Session 2)
- **Vue détaillée des activités**: 
  - Clic sur "Total du bilan" ouvre modal "Bilan complet" avec toutes les activités
  - Colonne Scope avec badges colorés pour identifier chaque entrée
  - Bouton modifier ouvre le modal de saisie pré-rempli
  - Titre "Modifier l'entrée" et bouton "Mettre à jour" en mode édition
  - Données pré-remplies: catégorie, sous-catégorie, unité, facteur, quantité
- **Correction routes API**: Préfixe `/api` ajouté à toutes les routes backend

### 2026-01-23 (Session 1)
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
- [x] Vue détaillée des activités avec édition via modal

### P1 - High Priority
- [ ] Corriger le mode sombre (arrière-plan principal reste clair)
- [ ] Implémenter entité "Produits et Services" avec impacts lifecycle
- [ ] Implémenter upload en masse (import CSV)
- [ ] Rapports PDF/Excel exportables
- [ ] Validation des données
- [ ] Graphiques de répartition par scope

### P2 - Medium Priority
- [ ] Améliorer la gamification (animations pour validations et jalons)
- [ ] Édition avancée dans la vue tabulaire
- [ ] Historique des bilans par année
- [ ] Comparaison année N vs N-1
- [ ] Notifications de progression

### P3 - Low Priority
- [ ] API externe pour intégration
- [ ] Mode collaboratif multi-utilisateurs par entreprise
- [ ] Refactoring DataEntry.js (800+ lignes → extraire modals en composants)

## Next Tasks
1. Corriger le mode sombre incomplet
2. Implémenter l'entité "Produits et Services" 
3. Ajouter page de rapports avec graphiques
4. Dashboard avec graphiques (pie chart, bar chart)

## Test Credentials
- Email: newtest@x.com
- Password: test123
