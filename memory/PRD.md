# Proto Carbon - Calculateur d'empreinte carbone

## Problème original
Calculateur d'empreinte carbone avec tableau de bord, objectifs et panneau d'administration. Approche hybride pour simplifier la sélection des facteurs d'émission.

## Architecture
- Frontend: React (port 3000) avec Tailwind, Shadcn/UI, framer-motion, recharts, fuse.js
- Backend: FastAPI (port 8001) avec MongoDB
- Langue par défaut: Français

## Ce qui est implémenté
- Auth, Dashboard, Saisie de données, Page Assistance, Menu latéral
- Recherche fuzzy (Fuse.js), FactorCard tooltips, boutons "Modifier"
- Enrichissement IA complet (1191/1191 facteurs)
- Conversion d'unités (5 dimensions, stockage Option C)
- **Product Wizard Phase 1** : cartes refondues, badge, émissions dominantes, barre composée, menu actions, détail pleine page
- **Product Wizard Phase 2** : validation par étape, aide contextuelle, revision rapide depuis résumé, labels lisibles, défauts intelligents
- **Product Wizard Phase 3 — COMPLÈTE (2026-03-02)** :
  - O3-A1 : Refonte logique produit GHG Protocol (Transformation 3.10 / Utilisation 3.11 / Fin de vie 3.12)
  - O3-A2 : Versionning des profils produit (version_history[] avec snapshots)
  - O3-A3 : Recalcul automatique (single product + batch from factor)
  - O3-A4 : Endpoint preview (calcul sans sauvegarde)
  - O3-A5 : Validation backend complète (factor IDs, quantities, noms)

## API Endpoints ajoutés (Phase 3)
- `POST /api/products/preview` — Calcul d'émissions sans sauvegarde
- `GET /api/products/{id}/versions` — Historique des versions
- `POST /api/products/{id}/recalculate` — Recalcul d'un produit
- `POST /api/products/recalculate-from-factor/{factor_id}` — Recalcul batch

## Backlog priorisé

### Phase 3 — Restant
- O3-A6 : Gestion erreur facteur manquant (produit utilisant un facteur supprimé)
- O3-A7 : Logs de calcul pour audit

### Phase 4 — Protocol et dette technique
- O4-A1 : Mapping scope 3.1 automatique matières
- O4-A2 : Mapping scope 3.4 transport amont
- O4-A3 : Rattachement automatique bilan GHG
- O5-A4/A5 : Refactoring wizard sous-composants
- O5-A6/A7 : Supprimer produits legacy

### Autres (P2-P3)
- Admin: AdminUnitsTab.jsx, champs enrichis AdminFactorsTab.jsx
- Refactoring GuidedEntryModal.js
- Notifications toast, skeleton loaders, audit trail, exports PDF/Excel

## Credentials de test
- Email: newtest@x.com / Password: test123
