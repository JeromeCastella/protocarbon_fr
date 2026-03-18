# PRD — Calculateur d'empreinte carbone

## Problème original
Application de calcul d'empreinte carbone alignée sur le GHG Protocol, avec tableau de bord, gestion de produits, objectifs et administration.

## Architecture
- **Frontend** : React + Recharts + Framer Motion + Shadcn/UI
- **Backend** : FastAPI + MongoDB
- **Intégrations** : SMTP (Infomaniak), OpenAI/Anthropic via clé universelle Emergent, Recharts, Fuse.js

## Fonctionnalités implémentées

### Core
- Gestion de produits avancée (GHG Protocol, versionning, recalcul)
- Tableau de bord moderne (graphiques empilés, icônes, palette pastel)
- Objectifs de réduction avec trajectoire
- Panneau d'administration (partiel)
- Authentification JWT sécurisée
- Support multilingue FR/DE

### TECH-01 — Assainissement base sous-catégories/EF (Fév 2026)
- 89 → 69 sous-catégories (nettoyage doublons, traductions, mappings)
- Script de validation automatisé : `pytest backend/tests/test_db_integrity.py` (14 tests)
- 0 anomalie détectée post-nettoyage

## Backlog priorisé

### Sprint 1
- [x] **TECH-01** : Assainissement base sous-catégories/EF
- [x] **FEAT-04** : Double mode de saisie Scope 3 Aval (fiche produit ou saisie directe)

### Sprint 1-2
- [x] **FEAT-02** : Mode Scénario sur les exercices (duplication, comparaison, dashboard)

### Sprint 2
- [x] **FEAT-01** : Onboarding guidé (tutoriel first-run, overlay contextuel react-joyride)
- [x] **UI-HARMONISATION** : Design unifié sur toutes les pages + modals (Mars 2026)
- [x] **CHART-TRAJECTORY** : Refonte graphique trajectoire — barres empilées Scope 1/2/3, area cible emerald, scénarios transparents, ligne de référence (Mars 2026)

### Sprint 3-4
- [x] **SCENARIO-ENTITY** : Scénarios comme entité first-class — dropdown, collection dédiée, migration des données existantes (Mars 2026)
- [x] **SCOPE-NORMALIZATION** : Normalisation du scope à l'écriture + module partagé `scope_mapping.py` + migration 47 activités (Mars 2026)
- [x] **REFACTOR-WIZARD** : Découpage ProductWizard.js (978→825 lignes, 8 fichiers modulaires, parité 100%) (Mars 2026)
- [x] **FIX-SCENARIO-MULTI-PERIOD** : Scénarios multi-périodes sur le graphique trajectoire + validation doublon année/scénario (Mars 2026)
- [x] **MIGRATION-BAFU-2025** : Migration base de données facteurs d'émission — 1191→8978 EFs, nouveaux champs is_public/popularity_score, 51 sous-catégories, 2 manquantes créées (Mars 2026)
- [x] **FILTER-IS-PUBLIC** : Filtre facteurs publics/experts dans GuidedEntryModal — toggle dans FactorSelectionStep, badge Expert sur FactorCard, tri backend par is_public+popularity_score (Mars 2026)
- [ ] **FEAT-03** : Gestion multi-utilisateurs (rôles admin/editor/viewer, invitations)

### Sprint 4+
- [ ] **FEAT-05** : Base de données actions plan climat cantonal

### Backlog technique
- [x] Refactoring `ProductWizard.js` (monolithique → sous-composants)
- [ ] Optimisation requêtes DB `dashboard.py` (projections MongoDB)
- [ ] Exports PDF/Excel
- [ ] Logs d'audit émissions (O3-A7, en attente de décision)
- [ ] Finaliser panneau d'administration (AdminUnitsTab, AdminFactorsTab)
- [ ] Base de données actions plan climat cantonal (FEAT-05)

## Décisions prises
- FEAT-02 : Scénarios illimités, sélecteur hiérarchisé en 2 niveaux (Option C), overlay trajectoire violet
- FEAT-04 : Badge traçabilité (fiche produit vs saisie directe) approuvé
- FEAT-01 : Overlay contextuel (type Shepherd.js), approche généraliste
- `emissions_procedes` : Laissée vide, à remplir plus tard
- `activites_combustibles_energie` : Pas de sous-catégories (saisie automatique)

## Credentials de test
- Email : `newtest@x.com`
- Password : `test123`
