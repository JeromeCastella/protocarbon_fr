# Proto Carbon - Calculateur d'empreinte carbone

## Problème original
Calculateur d'empreinte carbone avec tableau de bord, objectifs et panneau d'administration. Approche hybride pour simplifier la sélection des facteurs d'émission.

## Architecture
- Frontend: React (port 3000) avec Tailwind, Shadcn/UI, framer-motion, recharts, fuse.js
- Backend: FastAPI (port 8001) avec MongoDB (DB: carbon_tracker)
- Langue par défaut: Français

## Ce qui est implémenté

### Core
- Auth, Dashboard, Saisie de données, Page Assistance, Menu latéral
- Recherche fuzzy (Fuse.js), FactorCard tooltips
- Enrichissement IA complet (1191/1191 facteurs)
- Conversion d'unités (5 dimensions, stockage Option C)

### Phase 3 — Produits GHG Protocol (COMPLÈTE)
- O3-A1 : Refonte logique produit (Transformation 3.10 / Utilisation 3.11 / Fin de vie 3.12)
- O3-A2 : Versionning profils produit (version_history[] + snapshots)
- O3-A3 : Recalcul automatique (single + batch from factor)
- O3-A4 : Endpoint preview
- O3-A5 : Validation backend complète
- O3-A6 : Factor snapshots + stale_factors + deprecation + badge "Recalcul disponible"

### Phase 4 — Mapping GHG (VÉRIFIÉ)
- O4-A1/A2/A3 : Les ventes de produits créent automatiquement des activités dans le bilan GHG
  - Transformation → transformation_produits (scope3_aval)
  - Utilisation → utilisation_produits (scope3_aval)
  - Fin de vie → fin_vie_produits (scope3_aval)
- Mise à jour/suppression de vente → MAJ/suppression des activités liées
- Configuration exercice 2029 corrigée (catégories produit réintégrées)

### UX Améliorations
- Bouton Modifier visible sur fiche + modale détail
- Cartes allégées (sans badge type, sans durée de vie, arrondi 1 digit)
- ProductSaleModal sobre (indicateurs toujours visibles, couleurs neutres)

## Backlog priorisé

### Phase 3 — Restant
- O3-A7 : Logs de calcul pour audit

### Phase 5 — Dette technique
- O5-A4/A5 : Refactoring wizard en sous-composants

### Autres (P2-P3)
- Admin: AdminUnitsTab.jsx, champs enrichis AdminFactorsTab.jsx
- Exports PDF/Excel

## Credentials de test
- Email: newtest@x.com / Password: test123
