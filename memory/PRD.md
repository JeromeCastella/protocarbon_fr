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

### 2026-01-23 (Session 3) - Produits et Cycle de Vie
- **Wizard de création de produit** en 4-5 étapes :
  - Étape 1: Infos générales (nom, type fini/semi-fini, durée de vie, unité)
  - Étape 2: Composition matières (sélection depuis facteurs d'émission, poids, traitement fin de vie)
  - Étape 3: Transformation (si semi-fini - électricité, combustible)
  - Étape 4: Utilisation (électricité, combustible, carburant, réfrigérants par cycle × cycles/an × durée vie)
  - Étape 5: Résumé avec aperçu des émissions par unité

- **Nouveaux facteurs d'émission** :
  - 15 matériaux (Acier, Aluminium, Cuivre, Plastiques, Verre, Bois, etc.)
  - 10 traitements fin de vie (Recyclage par matière, Incinération, Enfouissement, DEEE)
  - 6 réfrigérants (R-134a, R-410A, R-32, R-404A, R-290, R-744)

- **Enregistrement des ventes** avec ventilation automatique vers :
  - Transformation des produits vendus (Scope 3 Aval)
  - Utilisation des produits vendus (Scope 3 Aval)
  - Traitement fin de vie des produits vendus (Scope 3 Aval)

- **Deux chemins d'accès pour les ventes** :
  - Depuis la page Produits (bouton "Enregistrer des ventes")
  - Depuis Saisie de données → Scope 3 Aval (catégories produits)

### 2026-01-23 (Session 2)
- **Vue détaillée des activités**: 
  - Clic sur "Total du bilan" ouvre modal "Bilan complet" avec toutes les activités
  - Colonne Scope avec badges colorés pour identifier chaque entrée
  - Bouton modifier ouvre le modal de saisie pré-rempli

### 2026-01-23 (Session 1)
- **Auth System**: Registration, Login, JWT tokens
- **Dashboard**: Vue d'ensemble avec émissions totales, progression par scope
- **Informations Générales**: Formulaire entreprise + périmètre du bilan
- **Saisie de données**: 22 catégories avec cartes colorées, modal d'ajout d'activité
- **Import/Export**: CSV et JSON
- **Gamification**: Barres de progression animées

## Prioritized Backlog

### P0 - Critical
- [x] MVP fonctionnel
- [x] Vue détaillée des activités avec édition via modal
- [x] Gestion des produits avec cycle de vie complet

### P1 - High Priority
- [ ] Corriger le mode sombre (arrière-plan principal reste clair)
- [ ] Rapports PDF/Excel exportables
- [ ] Graphiques de répartition par scope (pie chart, bar chart)

### P2 - Medium Priority
- [ ] Améliorer la gamification (animations pour validations et jalons)
- [ ] Historique des bilans par année
- [ ] Comparaison année N vs N-1
- [ ] Refactoring DataEntry.js (800+ lignes → extraire en composants)

### P3 - Low Priority
- [ ] API externe pour intégration
- [ ] Mode collaboratif multi-utilisateurs par entreprise
- [ ] Import en masse CSV (bulk upload)

## API Endpoints Clés

### Produits enrichis
- `POST /api/products/enhanced` - Créer produit avec cycle de vie
- `PUT /api/products/enhanced/{id}` - Modifier produit
- `GET /api/products/{id}` - Obtenir un produit
- `POST /api/products/{id}/sales/enhanced` - Enregistrer ventes → activités Scope 3 Aval

### Facteurs d'émission
- `GET /api/emission-factors/by-category/{category}` - Par catégorie (materiaux, fin_vie_produits, refrigerants)
- `GET /api/emission-factors/by-tags?tags=combustible` - Par tags
- `POST /api/emission-factors/seed-new` - Seed nouveaux facteurs

## Test Credentials
- Email: newtest@x.com
- Password: test123

## Fichiers Clés
- `/app/frontend/src/components/ProductWizard.js` - Wizard création produit
- `/app/frontend/src/components/ProductSaleModal.js` - Modal enregistrement ventes
- `/app/frontend/src/pages/Products.js` - Page produits
- `/app/frontend/src/pages/DataEntry.js` - Saisie données avec intégration produits
- `/app/backend/server.py` - API complète avec calcul émissions cycle de vie
