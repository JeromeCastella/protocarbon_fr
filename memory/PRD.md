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

### Phase 3 — Produits GHG Protocol (COMPLETE)
- O3-A1 à O3-A6 : Logique produit GHG, versionning, recalcul, preview, validation, snapshots

### Phase 4 — Mapping GHG (VERIFIE)
- Ventes produits -> activités GHG automatiques

### UX Améliorations
- Bouton Modifier visible sur fiche + modale détail
- Cartes allégées, ProductSaleModal sobre

### Modernisation Dashboard — Onglet Résultats (COMPLETE - 02/03/2026)
- Palette pastels (#FB923C, #60A5FA, #A78BFA, #F9A8D4)
- AreaChart empilé (stackId) avec gradients pour l'évolution
- Top 7 sous-catégories avec traductions FR
- Barres Scope affinées, grille discrète, ombres allégées
- **Drill-down avec icônes** : custom XAxis tick utilisant les icônes Lucide des catégories (même iconMap que DataEntry) + tooltip personnalisé avec icône + nom traduit

### Modernisation Dashboard — Onglet Objectifs (COMPLETE - 02/03/2026)
- ComposedChart avec Areas gradient dashed (cibles) + Bars pastels (réels)
- Couleurs harmonisées : sky-400 (Scope 1&2), violet-400 (Scope 3)
- Grille allégée, axes épurés, tooltip modernisé

## Backlog priorisé

### Phase 3 — Restant
- O3-A7 : Logs de calcul pour audit (en attente décision utilisateur)

### Phase 5 — Dette technique
- O5-A4/A5 : Refactoring wizard en sous-composants

### Autres (P2-P3)
- Admin: AdminUnitsTab.jsx, champs enrichis AdminFactorsTab.jsx
- Exports PDF/Excel

## Credentials de test
- Email: newtest@x.com / Password: test123
