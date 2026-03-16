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
- [x] **UI-HARMONISATION** : Design unifié sur toutes les pages (Mars 2026)

### Sprint 3-4
- [ ] **FEAT-03** : Gestion multi-utilisateurs (rôles admin/editor/viewer, invitations)

### Sprint 4+
- [ ] **FEAT-05** : Base de données actions plan climat cantonal

### Backlog technique
- [ ] Refactoring `ProductWizard.js` (monolithique → sous-composants)
- [ ] Optimisation requêtes DB `dashboard.py` (projections MongoDB)
- [ ] Exports PDF/Excel
- [ ] Logs d'audit émissions (O3-A7, en attente de décision)

## Décisions prises
- FEAT-02 : Scénarios illimités, sélecteur hiérarchisé en 2 niveaux (Option C), overlay trajectoire violet
- FEAT-04 : Badge traçabilité (fiche produit vs saisie directe) approuvé
- FEAT-01 : Overlay contextuel (type Shepherd.js), approche généraliste
- `emissions_procedes` : Laissée vide, à remplir plus tard
- `activites_combustibles_energie` : Pas de sous-catégories (saisie automatique)

## Credentials de test
- Email : `newtest@x.com`
- Password : `test123`
