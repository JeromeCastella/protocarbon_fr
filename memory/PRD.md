# Proto Carbon - Calculateur d'empreinte carbone GHG Protocol

## Problème Original
Application de calcul d'empreinte carbone selon le protocole GHG avec interface user-friendly, gamification, multi-tenant, multi-langue (FR/DE), mode clair/sombre.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Framer Motion + Recharts
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

### 2026-01-24 (Session 7) - Panneau Administration
- **Interface Admin complète** accessible via `/admin` :
  - Visible uniquement pour utilisateurs avec rôle `admin`
  - Lien conditionnel dans la navigation sidebar
- **Gestion des facteurs d'émission** :
  - Liste avec recherche, tri par scope (badges colorés)
  - CRUD complet (Ajouter, Modifier, Supprimer)
  - Export JSON de tous les facteurs
  - Import JSON avec option de remplacement total
- **Gestion des utilisateurs** :
  - Liste de tous les utilisateurs avec email, nom, rôle, date création
  - Promouvoir/Rétrograder admin
  - Badge "Vous" pour l'utilisateur connecté
- **RBAC Backend** :
  - Middleware `require_admin` sur tous les endpoints `/api/admin/*`
  - Erreur 403 pour utilisateurs non-admin
- **Sécurité Frontend** :
  - Page "Accès refusé" pour non-admins sur `/admin`

### 2026-01-23 (Session 6) - Dashboard Graphiques Comparatifs
- **4 KPIs** :
  - Émissions totales avec variation %
  - Variation N-1 (comparaison exercice précédent)
  - Émissions par employé
  - Exercice actuel + nombre d'exercices
- **Graphique évolution par exercice** :
  - Bar chart empilé par scope (Scope 1, 2, 3 Amont, 3 Aval)
  - Série temporelle de tous les exercices fiscaux
- **Graphique répartition par scope avec drill-down** :
  - Bar chart horizontal par scope
  - Sélecteur d'exercice fiscal
  - Clic sur scope → détail par catégorie
- **Nouveaux endpoints API** :
  - `/api/dashboard/kpis`
  - `/api/dashboard/fiscal-comparison`
  - `/api/dashboard/scope-breakdown/{fiscal_year_id}`

### 2026-01-23 (Session 5) - Simplification Configuration Exercice Fiscal + Mode Sombre
- **Configuration exercice fiscal au niveau entreprise** :
  - Paramètre unique dans "Informations générales" (mois et jour de début)
  - Par défaut : 1er janvier - 31 décembre
  - Création d'exercice simplifiée : seulement l'année à saisir
  - Dates calculées automatiquement selon configuration entreprise
- **Mode sombre corrigé** :
  - Fond de la zone principale maintenant en bg-slate-900
  - Toutes les pages respectent le thème

### 2026-01-23 (Session 4) - Gestion des Exercices Fiscaux
- **Exercices fiscaux** avec année paramétrable :
  - Création d'exercices avec nom, date début/fin
  - Clôture avec verrouillage et génération de résumé (total émissions, par scope, par catégorie)
  - Rectification (réouverture) avec justification obligatoire + historique des rectifications
  - Duplication vers nouvel exercice avec option de copier les activités
  - Reprise automatique des fiches produits
- **Sélecteur d'exercice** dans la sidebar pour naviguer entre périodes
- **Page dédiée** `/fiscal-years` pour gérer les exercices

### 2026-01-23 (Session 3) - Produits et Cycle de Vie
- **Wizard de création de produit** en 4-5 étapes (infos, matériaux, transformation, utilisation, résumé)
- **Nouveaux facteurs d'émission** : 15 matériaux, 10 traitements fin de vie, 6 réfrigérants
- **Enregistrement des ventes** avec ventilation Scope 3 Aval
- **Deux chemins d'accès** : page Produits + catégories Scope 3 Aval

### Sessions précédentes
- Auth System, Dashboard, Informations Générales
- Saisie de données avec 22 catégories, modal guidé
- Vue détaillée des activités avec édition via modal
- Import/Export CSV et JSON
- Gamification avec barres de progression

## Prioritized Backlog

### P0 - Critical
- [x] MVP fonctionnel
- [x] Gestion des produits avec cycle de vie
- [x] Gestion des exercices fiscaux
- [x] Configuration exercice fiscal simplifiée (paramètre entreprise)
- [x] Mode sombre fonctionnel
- [x] Graphiques comparatifs entre exercices fiscaux (dashboard)
- [x] Panneau Administration (facteurs d'émission + utilisateurs)

### P1 - High Priority
- [ ] Rapports PDF/Excel exportables
- [ ] Pie chart de répartition globale

### P2 - Medium Priority
- [ ] Import en masse CSV (bulk upload)
- [ ] Améliorer la gamification (animations, badges pour jalons)
- [ ] Notifications Toast (sonner) pour confirmations
- [ ] Refactoring DataEntry.js (1200+ lignes → composants)

### P3 - Low Priority
- [ ] API externe pour intégration
- [ ] Mode collaboratif multi-utilisateurs par entreprise
- [ ] Import en masse CSV (bulk upload)

## API Endpoints Clés

### Administration (Admin only)
- `GET /api/admin/users` - Liste tous les utilisateurs
- `PUT /api/admin/users/{id}/role` - Modifier rôle utilisateur
- `GET /api/admin/emission-factors` - Liste tous les facteurs
- `POST /api/admin/emission-factors` - Créer facteur
- `PUT /api/admin/emission-factors/{id}` - Modifier facteur
- `DELETE /api/admin/emission-factors/{id}` - Supprimer facteur
- `GET /api/admin/emission-factors/export` - Export JSON
- `POST /api/admin/emission-factors/import` - Import JSON

### Exercices fiscaux
- `GET /api/fiscal-years` - Liste des exercices
- `GET /api/fiscal-years/current` - Exercice actif
- `POST /api/fiscal-years` - Créer exercice
- `POST /api/fiscal-years/{id}/close` - Clôturer (verrouillage + résumé)
- `POST /api/fiscal-years/{id}/rectify` - Réouvrir avec justification
- `POST /api/fiscal-years/{id}/duplicate` - Créer nouvel exercice depuis existant

### Produits enrichis
- `POST /api/products/enhanced` - Créer produit avec cycle de vie
- `POST /api/products/{id}/sales/enhanced` - Ventes → activités Scope 3 Aval

## Test Credentials
- **Admin**: newtest@x.com / test123
- **User**: regular_user_test@test.com / test123

## Fichiers Clés
- `/app/frontend/src/pages/Admin.js` - Panneau administration
- `/app/frontend/src/context/FiscalYearContext.js` - Context exercices fiscaux
- `/app/frontend/src/components/FiscalYearSelector.js` - Sélecteur d'exercice
- `/app/frontend/src/pages/FiscalYears.js` - Page gestion exercices
- `/app/frontend/src/components/ProductWizard.js` - Wizard création produit
- `/app/backend/server.py` - API complète (incl. endpoints admin)
