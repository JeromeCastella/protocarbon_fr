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
- **Product Wizard Phase 1** : cartes refondues (header neutre, badge, émissions dominantes, barre composée, menu actions, détail pleine page)
- **Product Wizard Phase 2** : validation par étape, aide contextuelle, revision rapide depuis résumé, labels lisibles, défauts intelligents, unités en toutes lettres

## Backlog priorisé

### Phase 3 — Données et calculs (backend)
- O3-A1 : Séparer materials_emissions / disposal_emissions
- O3-A2 : Versionning profils produit
- O3-A3 : Recalcul automatique MAJ facteurs
- O3-A4 : Endpoint calcul preview
- O3-A5 : Validation backend complète
- O3-A6 : Gestion erreur facteur manquant
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
