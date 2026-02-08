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
- [x] **Données contextuelles par exercice fiscal** (employees, revenue, surface_area, excluded_categories)
- [x] **Support multi-impacts GHG Protocol** (création d'activités liées pour les facteurs multi-scopes)

## What's Been Implemented

### 2026-02-08 - Bug fix COMPLET: Logique multi-impacts GHG Protocol ✅ (P0)
- **Problème initial** : La logique multi-impacts ne fonctionnait pas correctement :
  1. Les activités `scope3_3` n'étaient pas créées pour les saisies Scope 1/2
  2. Les activités `scope3_3` apparaissaient dans la mauvaise catégorie (catégorie de saisie au lieu de `activites_combustibles_energie`)
  3. Les saisies Scope 3 ne créaient aucune activité
- **Causes racines** :
  1. `normalize_scope()` convertissait incorrectement `scope3_amont` en `scope3_3`
  2. `create_activity_for_impact()` assignait toujours `category_id` de la saisie, sans tenir compte du scope de l'impact
- **Solution complète** :
  1. Suppression de `scope3_amont` de la liste de normalisation vers `scope3_3`
  2. Ajout dans `create_activity_for_impact()` : si `impact_scope == 'scope3_3'` alors `category_id = 'activites_combustibles_energie'`
  3. Correction de `entry_category` (était `entry_scope` par erreur)
- **Fichiers modifiés** :
  - `/app/backend/routes/activities.py` : `normalize_scope()`, `apply_business_rules()`, `create_activity_for_impact()`
  - `/app/frontend/src/components/GuidedEntryModal.js` : `normalizeScope()`, `applyBusinessRules()`, `scopeColors`
- **Tests** : 18/18 tests passés (100%)
  - `/app/backend/tests/test_multi_impacts.py`
  - `/app/backend/tests/test_ghg_protocol_rules.py`
- **Cas d'usage validés** :
  | Saisie | Facteur | Résultat |
  |--------|---------|----------|
  | Scope 1 (combustion_fixe) | Chaudière mazout | scope1 → combustion_fixe (7.39 tCO2e) + scope3_3 → activites_combustibles_energie (2.93 tCO2e) |
  | Scope 2 (electricite) | Gaz naturel | scope2 → electricite (43.27 tCO2e) + scope3_3 → activites_combustibles_energie (14.37 tCO2e) |
  | Scope 3 (deplacements_professionnels) | Scooter EURO-5 | scope3 → deplacements_professionnels (96.85 tCO2e) |

### 2026-02-08 - Multi-impacts GHG Protocol ✅ (P0 - MAJOR)
- **Contexte** : Les facteurs d'émission peuvent avoir plusieurs impacts (ex: Diesel = Scope 1 + Scope 3.3). Avant, une seule activité était créée avec la somme des émissions, ce qui faussait la répartition par scope.
- **Règles métier finales** :
  - Un facteur peut avoir jusqu'à 4 impacts : `scope1`, `scope2`, `scope3_3`, `scope3`
  - **Saisie Scope 1 ou 2** → inclure impacts `scope1`, `scope2`, `scope3_3`
  - **Saisie Scope 3.3** (catégorie `activites_combustibles_energie`) → inclure uniquement `scope3_3`
  - **Saisie Scope 3** (autres catégories) → inclure uniquement impact `scope3`
  - **Si value = 0** → ne pas créer de ligne
  - Normalisation automatique des scopes (`scope3.3`, `scope33` → `scope3_3`) - NOTE: `scope3_amont` n'est PAS normalisé en `scope3_3`
- **Solution implémentée** :
  1. **`apply_business_rules`** : Filtre les impacts selon le contexte de saisie
  2. **`normalize_scope`** : Normalise les différentes notations de scope
  3. **Création multi-activités** : `POST /api/activities` crée N activités liées par un `group_id`
  4. **Endpoints de groupe** : GET/PUT/DELETE `/api/activities/groups/{group_id}`
  5. **UI TableView** : Indicateurs visuels de groupe (🔗 2 pour principale, ↳ pour secondaires)
- **Nouveaux champs MongoDB** :
  - `group_id` : UUID liant les activités d'une même saisie
  - `group_index` : 0 = principale, 1+ = secondaires
  - `group_size` : Nombre d'activités dans le groupe
  - `entry_scope` : Scope de saisie original
  - `entry_category` : Catégorie de saisie originale
- **Fichiers modifiés** :
  - `/app/backend/models/__init__.py` : `ActivityCreate` + `ActivityGroupUpdate`
  - `/app/backend/routes/activities.py` : Logique multi-impacts + endpoints groupe
  - `/app/frontend/src/components/GuidedEntryModal.js` : Envoi de `entry_scope`, `entry_category`
  - `/app/frontend/src/pages/DataEntry.js` : Gestion des groupes + UI

### 2026-02-08 - Bug fix: Édition d'activité Scope 3 ✅ (P0)
- **Problème** : Lors de l'édition d'une activité depuis la TableView, le modal s'ouvrait à l'étape 3 (sélection du facteur) pour les activités Scope 3, au lieu de l'étape 4 (formulaire final) comme pour les Scopes 1 et 2.
- **Cause racine** : 
  1. L'endpoint `/api/emission-factors/search` limite les résultats à 100 facteurs. Si le facteur de l'activité n'était pas dans ces 100 premiers, il n'était pas trouvé.
  2. Quand `selectedFactor` est `null`, la condition `step >= 4 && selectedFactor` empêche l'affichage de l'étape 4, laissant apparaître l'étape 3.
- **Solution** :
  1. **Backend** : Ajout d'un nouvel endpoint `GET /api/emission-factors/{factor_id}` pour récupérer un facteur par son ID.
  2. **Ordre des routes** : Positionnement de `/{factor_id}` EN DERNIER dans `reference_data.py` pour éviter les conflits avec `/search`, `/by-category`, etc.
  3. **Frontend** : Dans `loadForEditing()` de `GuidedEntryModal.js`, si le facteur n'est pas trouvé dans les résultats de recherche, une requête supplémentaire récupère le facteur par son ID.
- **Fichiers modifiés** :
  - `/app/backend/routes/reference_data.py` : Nouvel endpoint `/{factor_id}` à la fin du fichier
  - `/app/frontend/src/components/GuidedEntryModal.js` : Logique de fallback dans `loadForEditing`
- **Tests effectués** : Édition réussie pour Scope 1 (Diesel) et Scope 3 (Alimentation) depuis la TableView

### 2026-02-08 - Bug fix: Matching strict unités/facteurs d'émission ✅
- **Problème** : Le modal de saisie guidée proposait des facteurs incompatibles avec l'unité choisie (ex: facteurs en L quand l'utilisateur choisissait km)
- **Cause** : La logique de conversion permettait des "sauts" entre dimensions (km → L via conversions globales)
- **Solution** : Matching strict - seuls les facteurs dont `input_units` contient l'unité sélectionnée sont affichés
- **Fichiers créés/modifiés** :
  - `frontend/src/utils/units.js` : Nouveau fichier utilitaire avec `normalizeUnit`, `filterFactorsByUnitStrict`, `getAvailableUnitsFromFactors`
  - `frontend/src/components/GuidedEntryModal.js` : Simplification de `extractAvailableUnits` et `handleUnitSelect`
- **Code supprimé** : Appel à `/api/unit-conversions`, état `unitConversions`, fonction `fetchUnitConversions`

### 2026-02-08 - Données contextuelles par exercice fiscal ✅ (MAJOR)
- **Nouveau schéma MongoDB** : Ajout d'un objet `context` dans `fiscal_years` contenant :
  - `employees` (int)
  - `revenue` (float)
  - `surface_area` (float)
  - `excluded_categories` (list)
- **Nouveaux endpoints API** :
  - `GET /api/fiscal-years/{id}/context` : Récupère le context avec fallback sur company
  - `PUT /api/fiscal-years/{id}/context` : Met à jour le context (bloqué si exercice clôturé)
  - `POST /api/fiscal-years/migrate-context` : Migration des exercices existants
- **Logique de création/duplication** :
  - À la création d'un exercice : copie le context de l'exercice N-1, ou de company si premier exercice
  - À la duplication : copie automatique du context source
- **Frontend GeneralInfo.js refondu** :
  - **Carte 1 "Identité de l'entreprise"** (bleu) : nom, localisation, secteur, type d'entité, consolidation → données stables
  - **Carte 2 "Données de l'exercice [Année]"** (orange) : employés, CA, surface → données contextuelles
  - **Carte 3 "Périmètre du bilan carbone"** : checkboxes liées au context de l'exercice
- **KPIs dashboard** : Utilisent maintenant les données du context de l'exercice sélectionné
- **Gestion readonly** : Exercices clôturés → context non modifiable
- **Migration exécutée** : 4 exercices migrés avec les valeurs de company

### 2026-02-08 - Correction carte "Périmètre du bilan carbone" ✅
- **Bug fix API** : Correction de l'endpoint `/api/company` → `/api/companies` dans le backend (`routes/companies.py`)
- **Nouvelle interface Option A** : Deux boutons distincts sur la carte "Périmètre du bilan carbone" :
  - **"🪄 Configuration guidée"** (bouton violet) → Ouvre le wizard interactif
  - **"✏️ Configuration manuelle"** (bouton gris avec chevron) → Affiche/masque les checkboxes des catégories par scope
- **Animation fluide** : Utilisation de `AnimatePresence` et `motion.div` pour l'affichage/masquage des checkboxes
- **État par défaut** : Les checkboxes sont affichées par défaut (`showManualConfig: true`)
- **Fichier modifié** : `/app/frontend/src/pages/GeneralInfo.js`

### 2026-02-08 - Groupement catégories "Produits vendus" ✅
- **Wizard** : Une seule question "Vendez-vous des produits physiques ?" qui active les 3 catégories (3.10, 3.11, 3.12)
- **Configuration manuelle** : Une checkbox groupée "Produits vendus" qui contrôle les 3 catégories ensemble
- **Fichier modifié** : `/app/frontend/src/pages/GeneralInfo.js`

### 2026-02-06 - Refonte onglet "Résultats" du Dashboard ✅
- **Implémentation complète du composant `DashboardResultsTab.js`** :
  - **3 KPI Cards** : Émissions totales, Émissions par kCHF, Variation N-1 (avec couleur verte/rouge selon tendance)
  - **Graphique "Émissions par Scope"** : Barres verticales avec drill-down par catégorie (clic sur une barre → affiche les sous-catégories)
  - **Top 10 sous-catégories** : Liste avec barres horizontales colorées et valeurs alignées à droite
  - **Graphique "Évolution des émissions"** : Barres empilées (Scope 1 orange, Scope 2 bleu, Scope 3 violet) par exercice fiscal
- **Tests automatisés créés** : 20 tests backend pour les APIs dashboard (100% réussis)
- **Fichier de tests** : `/app/backend/tests/test_dashboard_results.py`
- **Design conforme à la maquette fournie par l'utilisateur**

### 2026-02-05 - Debug global et complet ✅
- **Tests automatisés créés** : 29 tests backend (pytest)
  - Authentification (login, credentials invalides, current user)
  - Dashboard (summary, KPIs, fiscal comparison, scope breakdown)
  - Activités (liste, pagination)
  - Produits (liste, détails, ventes, profils d'émission)
  - Facteurs d'émission (liste, recherche, par catégorie)
  - Données de référence (catégories, sous-catégories)
  - Exercices fiscaux
  - Admin (utilisateurs, sous-catégories, facteurs V2)
  - Export (full, emission factors, reference data)
  - Objectifs (get, trajectory, recommendations)
- **Résultat** : 100% tests passés (29/29)
- **Fichier de tests** : `/app/backend/tests/test_comprehensive_features.py`

### 2026-02-05 - Corrections bugs ✅
- **Association activités-exercice fiscal** : Les nouvelles saisies sont maintenant associées à l'exercice sélectionné
- **Sous-catégories dynamiques** : Les modifications admin se reflètent dans la saisie guidée
- **Gestion utilisateurs** : Bouton supprimer avec confirmation, promotion admin fonctionnelle
- **URL email** : FRONTEND_URL configuré pour protocarbonfr.watted.ch

### 2026-02-05 - Système d'authentification complet ✅
- **Récupération de mot de passe** :
  - Page `/forgot-password` pour demander un lien de réinitialisation
  - Page `/reset-password` pour définir un nouveau mot de passe
  - Emails HTML professionnels FR/DE via SMTP Infomaniak
  - Tokens sécurisés (SHA256) avec expiration 1h
- **Changement de mot de passe** :
  - API `/api/auth/change-password` pour utilisateurs connectés
  - Vérification du mot de passe actuel
- **Vérification d'email** :
  - Page `/verify-email` avec token sécurisé (24h)
  - Email de bienvenue avec lien de confirmation
  - Champ `email_verified` dans le profil utilisateur
- **Indicateur de force du mot de passe** :
  - Barre de progression visuelle (Faible → Excellent)
  - Checklist des 5 critères (longueur, majuscule, minuscule, chiffre, spécial)
- **Verrouillage de compte** :
  - 5 tentatives échouées → blocage 15 minutes
  - Email de notification de verrouillage
  - API admin `/api/auth/users/{id}/unlock`
- **Remember Me** :
  - Option "Se souvenir de moi" sur la page de connexion
  - Token étendu à 30 jours si activé

### 2026-02-05 - Import en masse ✅
- Import de **1190 facteurs d'émission** (BAFU 2024)
- Import de **89 sous-catégories**
- Correction de l'affichage des facteurs (support format V2 avec `name_fr`/`name_de` et `impacts[]`)

### 2026-01-30 - Export JSON complet ✅
- **Nouvel onglet Admin "Export"** :
  - 5 types d'export : Sauvegarde complète, Données de référence, Facteurs d'émission, Activités, Produits
  - Sélection par exercice fiscal (tous ou un exercice spécifique)
  - Format JSON téléchargeable automatiquement
- **Nouvelles APIs Backend** :
  - `GET /api/export/full?fiscal_year_id=xxx` - Export complet filtré
  - `GET /api/export/reference-data` - Facteurs + sous-catégories + conversions
  - `GET /api/export/emission-factors` - Facteurs d'émission seuls
  - `GET /api/export/activities?fiscal_year_id=xxx` - Export activités
  - `GET /api/export/products` - Export produits
- **Contenu de l'export complet** :
  - Métadonnées d'export (date, utilisateur, version)
  - Données entreprise, exercices fiscaux, activités, produits
  - **63 facteurs d'émission**, **42 sous-catégories**, **11 conversions d'unités**
  - Objectifs carbone, statistiques

### 2026-01-27 (Session actuelle) - Gestion des ventes produits par exercice fiscal ✅
- **Ventes liées par sale_id** :
  - Chaque vente génère un `sale_id` unique liant les 3 activités (transformation, utilisation, fin de vie)
  - Modification/suppression groupée via les nouveaux endpoints
- **Filtrage par exercice fiscal** :
  - Les ventes sont maintenant filtrées par l'exercice fiscal courant
  - Changer d'exercice fiscal → voir/modifier les ventes de cet exercice uniquement
  - Le champ date respecte les limites de l'exercice fiscal
- **Archivage automatique des produits** :
  - DELETE sur un produit avec des ventes → archivage (soft delete)
  - DELETE sur un produit sans ventes → suppression permanente
  - Nouveau endpoint PUT /api/products/{id}/restore pour restaurer
- **Interface améliorée** :
  - Modal affiche l'exercice fiscal courant avec dates (start → end)
  - Mode "Modifier" si vente existante pour l'exercice, sinon mode "Enregistrer"
  - Champ Date au lieu d'Année avec contraintes min/max
- **Nouveaux endpoints API** :
  - `GET /api/products?include_archived=true` - Inclure les archivés
  - `GET /api/products/archived` - Liste des produits archivés
  - `GET /api/products/{id}/sales?fiscal_year_id=xxx` - Ventes filtrées par exercice
  - `PUT /api/products/{id}/restore` - Restaurer un produit archivé

### 2026-01-27 (Session précédente) - Nettoyage Backend (P0) + Refactoring Admin.js (P1) + Traductions (P1) ✅
- **Nettoyage complet de `server.py`** :
  - Réduction de 3556 lignes → 29 lignes (99% de réduction)
  - Le fichier ne contient plus que : FastAPI init, CORS, import du routeur modulaire, health check
- **Refactoring complet de `Admin.js`** :
  - Réduction de 1915 lignes → 94 lignes (95% de réduction)
  - Nouveaux composants créés dans `/app/frontend/src/components/admin/` :
    - `AdminFactorsTab.jsx` (886 lignes) : Onglet facteurs avec toutes les modales
    - `AdminSubcategoriesTab.jsx` (359 lignes) : Onglet sous-catégories avec modal
    - `AdminUsersTab.jsx` (83 lignes) : Onglet utilisateurs
    - `AdminHeader.jsx` (25 lignes) : En-tête de la page
    - `AdminTabs.jsx` (35 lignes) : Navigation par onglets
  - Nouveau hook `/app/frontend/src/hooks/useAdminData.js` (106 lignes) : Gestion des données admin
- **Mise à jour complète des traductions FR/DE** :
  - Fichiers `fr.json` et `de.json` enrichis avec ~300 nouvelles clés
  - Sections ajoutées : `dashboard`, `admin`, `fiscalYear`, `errors`, `confirmations`
  - Tous les composants Admin maintenant entièrement traduits
  - Affichage dynamique des noms selon la langue (nom_fr/nom_de)
- **Validation complète** :
  - 33 tests unitaires pytest backend passent
  - Tous les onglets Admin fonctionnent (Facteurs, Sous-catégories, Utilisateurs)
  - Interface testée en français et en allemand

### 2026-01-26 (Session précédente) - Migration Routes + Tests Unitaires
- **Routes migrées vers architecture modulaire** :
  - `routes/auth.py` : Authentification (login, register, users)
  - `routes/companies.py` : Gestion entreprises (CRUD)
  - `routes/activities.py` : Activités avec pagination
  - `routes/objectives.py` : Objectifs SBTi (CRUD + trajectory + recommendations)
- **Tests unitaires pytest créés** (33 tests) :
  - `test_auth.py` : 7 tests (password hashing, JWT tokens)
  - `test_emissions.py` : 15 tests (calculs, conversions, snapshots, formatage)
  - `test_models.py` : 11 tests (validation Pydantic)
- **Documentation** : `ARCHITECTURE.md` mise à jour avec guide complet

### 2026-01-26 (Session précédente) - Refactoring Architecture
- **Backend restructuré** :
  - `config.py` : Configuration et connexion MongoDB
  - `models/__init__.py` : Tous les modèles Pydantic (User, Activity, EmissionFactor, etc.)
  - `services/auth.py` : Authentification (JWT, password hashing)
  - `services/emissions.py` : Calculs d'émissions
  - `utils/__init__.py` : Fonctions utilitaires (serialize_doc, format_emissions)
  - `routes/auth.py` : Routes authentification (exemple de migration)
  - `ARCHITECTURE.md` : Documentation de la nouvelle structure
- **Frontend restructuré** :
  - `components/modals/ObjectiveModal.jsx` : Modal objectifs SBTi extrait
  - `components/dashboard/RecommendationsList.jsx` : Liste des recommandations
  - `hooks/useStaticData.js` : Hook de cache pour données statiques

### 2026-01-26 (Session précédente) - Optimisations Performance
- **Index MongoDB** créés pour accélérer les requêtes :
  - `activities`: indexes sur `tenant_id+date`, `tenant_id+company_id`, `tenant_id+scope`, `tenant_id+category_id`
  - `emission_factors`: indexes sur `tenant_id+deleted_at`, `subcategory+valid_from_year`
  - `fiscal_years`: indexes sur `tenant_id+start_date`, `company_id+status`
  - `carbon_objectives`: index sur `company_id+status`
- **API Activities paginée** : Nouveau format `{ data: [...], pagination: { page, limit, total, pages } }`
- **Cache-Control headers** : Ajoutés sur `/api/categories`, `/api/subcategories`, `/api/unit-conversions` (1h)
- **Hook useStaticData** : Cache frontend pour données statiques (catégories, sous-catégories, conversions)
- **Frontend adapté** : Dashboard et DataEntry mis à jour pour gérer la pagination

### 2026-01-26 (Session précédente) - Corrections KPI Dashboard + Indicateurs Objectifs
- **Corrections onglet "Suivi de saisie"** :
  - Corrigé l'affichage des catégories remplies (8/16 au lieu de 0/16)
  - Corrigé le calcul de progression (50% au lieu de 0%)
  - Corrigé l'affichage des volumes CO₂ par scope
- **Corrections onglet "Résultats"** :
  - Corrigé le calcul des KPI "Par employé" et "Par kCHF" 
  - API KPIs modifiée pour détecter automatiquement l'exercice fiscal avec des données
  - Corrigé l'affichage de "Variation N-1" (affiche "-" au lieu de "null%")
- **Améliorations onglet "Objectifs"** :
  - Ajout d'indicateurs de progression sur les objectifs Scope 1&2 et Scope 3
  - Barres de progression colorées (bleu/ambre → vert quand >= 50%)
  - Badge "✓ En bonne voie" ou "⚠ Effort requis" selon la trajectoire
  - Affichage de l'année courante dans le label "Progression (2026)"
  - Correction du calcul pour utiliser les vraies émissions actuelles

### 2026-01-26 (Session précédente) - Onglet Objectifs SBTi
- **Remplacement de l'onglet "Avancé" par "Objectifs"** :
  - Modal de configuration d'objectifs SBTi Near-term (2030 ou 2035)
  - Sélection de l'année de référence (baseline) parmi les exercices fiscaux
  - Calcul automatique des baselines par scope à partir des activités
  - Trajectoire de réduction linéaire visualisée dans un graphique combiné (lignes + barres)
  - Comparaison réel vs cible par année
  - Mesures recommandées basées sur les top 3 catégories émettrices
- **Nouvelles APIs Backend** :
  - `POST /api/objectives` - Création d'objectif avec calcul baseline automatique
  - `GET /api/objectives` - Récupération de l'objectif actif
  - `GET /api/objectives/trajectory` - Données de trajectoire pour graphiques
  - `GET /api/objectives/recommendations` - Mesures recommandées
  - `DELETE /api/objectives/{id}` - Archivage d'objectif
- **Nouvelle collection MongoDB** : `carbon_objectives`
- **Configuration SBTi** :
  - 2030 : -42% Scope 1&2, -25% Scope 3
  - 2035 : -65% Scope 1&2, -39% Scope 3

### 2026-01-26 (Session précédente) - Validation refonte Dashboard 3 onglets
- **Dashboard restructuré en 3 onglets** :
  - **Onglet "Suivi de saisie"** : Statistiques (activités saisies, produits définis, catégories remplies, progression), avancement par scope avec barres de progression, gamification
  - **Onglet "Résultats"** : KPI (émissions totales, par employé, par kCHF, variation N-1), graphiques d'évolution par exercice et répartition par scope, bouton recalcul avec facteurs actuels
  - **Onglet "Objectifs"** : Configuration d'objectifs SBTi avec trajectoire et recommandations
- **Fonctionnalité de recalcul validée** : Modal permettant de simuler le calcul des émissions d'un exercice passé avec les facteurs actuels

### 2026-01-24 (Session 7) - REFONTE FACTEURS D'ÉMISSION (Phases 1-4)

#### Phase 1 - Structure de données
- **Nouvelle collection `subcategories`** : Relation N-N avec catégories, multilingue FR/DE
- **Nouvelle collection `unit_conversions`** : Conversions globales (km→L, MWh→kWh, etc.)
- **Format V2 des facteurs** : `name_fr`, `name_de`, `subcategory`, `input_units[]`, `impacts[]`
- **Migration** : 54 facteurs V1 → V2, 41 sous-catégories, 11 conversions

#### Phase 2 - Modal de saisie guidée
- **Parcours en 4 étapes** : Sous-catégorie → Unité → Facteur → Quantité
- **Breadcrumb dynamique** : Catégorie > Sous-catégorie > Unité
- **Recherche facteurs** : Par nom, tags, avec badges scope/valeur
- **Calcul automatique** : tCO₂e en temps réel

#### Phase 3 - Multi-impacts + Règles métier
- **Facteurs multi-impacts** : Un facteur peut avoir plusieurs impacts (Scope 1 + Scope 3.3)
- **Règle métier Scope 1/2** : Inclut automatiquement Scope 3.3 (amont énergie)
- **Règle métier Scope 3** : Exclut Scope 1, 2 et 3.3 (seulement les impacts Scope 3 correspondants)
- **Création multi-lignes** : 1 saisie → plusieurs activités liées par `linked_group_id`

#### Phase 4 - Admin enrichi
- **3 onglets Admin** : Facteurs (60), Sous-catégories (41), Utilisateurs (11)
- **Formulaire V2** : Multi-impacts, unités multiples, conversions, tags
- **CRUD sous-catégories** : Code, Nom FR/DE, catégories liées (N-N), icône, ordre

### Session précédente - Panneau Administration de base
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

### P0 - Critical (TOUS TERMINÉS ✅)
- [x] MVP fonctionnel
- [x] Gestion des produits avec cycle de vie
- [x] Gestion des exercices fiscaux
- [x] Configuration exercice fiscal simplifiée (paramètre entreprise)
- [x] Mode sombre fonctionnel
- [x] Graphiques comparatifs entre exercices fiscaux (dashboard)
- [x] Panneau Administration (facteurs d'émission + utilisateurs)
- [x] Refonte Dashboard en 3 onglets (Suivi de saisie, Résultats, Objectifs)
- [x] Versioning des facteurs d'émission par année
- [x] Wizard configuration périmètre (Informations générales)
- [x] Recalcul des émissions avec facteurs actuels
- [x] **Nettoyage du backend** : server.py refactorisé (3556→29 lignes)
- [x] **Gestion liée des ventes produits** : sale_id unique lie les 3 activités (transformation, utilisation, fin de vie)
- [x] **Refonte onglet Résultats** : 3 KPI Cards, Scope Chart avec drill-down, Top 10, Évolution

### P1 - High Priority
- [x] **Refactoring Frontend Admin.js** : 1915→94 lignes (6 composants extraits)
- [x] **Export JSON complet** : Sauvegarde complète de la base de données avec filtre par exercice fiscal
- [ ] Rapports PDF/Excel exportables
- [ ] Import en masse CSV (bulk upload activities)
- [ ] Objectifs long-term SBTi (Net-Zero 2050)

### P2 - Medium Priority
- [ ] Améliorer la gamification (animations, badges pour jalons)
- [ ] Notifications Toast (sonner) pour confirmations
- [ ] Skeleton loaders au lieu de spinners
- [ ] Audit Trail (historique des modifications)
- [ ] Refactoring DataEntry.js (1200+ lignes → composants)
- [ ] Traduire les composants Dashboard et DataEntry (partiellement fait)

### P3 - Low Priority
- [ ] API externe pour intégration
- [ ] Mode collaboratif multi-utilisateurs par entreprise
- [ ] Complétion traductions allemandes

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
- `POST /api/products/{id}/sales` - Enregistrer vente avec sale_id unique
- `GET /api/products/{id}/sales` - Liste des ventes d'un produit
- `GET /api/products/{id}/sales/{sale_id}` - Détails d'une vente et ses activités liées
- `PUT /api/products/{id}/sales/{sale_id}` - Modification groupée d'une vente
- `DELETE /api/products/{id}/sales/{sale_id}` - Suppression groupée d'une vente

## Test Credentials
- **Admin**: newtest@x.com / test123
- **User**: regular_user_test@test.com / test123

## Fichiers Clés
- `/app/frontend/src/pages/Admin.js` - Panneau administration
- `/app/frontend/src/context/FiscalYearContext.js` - Context exercices fiscaux
- `/app/frontend/src/components/FiscalYearSelector.js` - Sélecteur d'exercice
- `/app/frontend/src/pages/FiscalYears.js` - Page gestion exercices
- `/app/frontend/src/components/ProductWizard.js` - Wizard création produit
- `/app/frontend/src/components/SaleEditModal.js` - Modal édition/suppression vente groupée
- `/app/backend/routes/products.py` - API ventes avec sale_id
- `/app/backend/server.py` - Point d'entrée FastAPI
