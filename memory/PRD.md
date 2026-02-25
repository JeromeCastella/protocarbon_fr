# Proto Carbon - Calculateur d'empreinte carbone

## Problème original
Calculateur d'empreinte carbone avec tableau de bord, objectifs et panneau d'administration. Approche hybride pour simplifier la sélection des facteurs d'émission : enrichissement IA, recherche fuzzy, conversion d'unités.

## Architecture
- Frontend: React (port 3000) avec Tailwind, Shadcn/UI, framer-motion, recharts, fuse.js
- Backend: FastAPI (port 8001) avec MongoDB
- Langue par défaut: Français

## Ce qui est implémenté
- Auth (login/register/JWT)
- Tableau de bord avec graphiques
- Saisie de données (GuidedEntryModal) avec parcours guidé en 4 étapes
- Page Assistance (FAQ + explorateur de facteurs)
- Menu latéral réorganisé en sections logiques
- Recherche fuzzy (Fuse.js) sur les facteurs d'émission
- FactorCard avec tooltips au survol de la carte entière
- Boutons "Modifier" sur les étapes condensées du modal
- Enrichissement IA POC sur 33 facteurs
- Multi-impacts GHG Protocol (Scope 1, 2, 3, 3.3)
- **Conversion d'unités** (implémenté 2025-02-25) :
  - 5 dimensions : énergie, distance, masse, volume, monétaire
  - API `/api/units/dimensions`
  - Unités natives + unités convertibles affichées séparément à l'étape 2
  - Indicateur "Équivalent" à l'étape 4 quand conversion active
  - Stockage Option C : quantity + unit (converti) + original_quantity + original_unit + conversion_factor
  - Backend routes/units.py, Frontend utils/units.js refactorisé

## Backlog priorisé

### P1
- Enrichissement IA des 1158 facteurs restants (script enrich_all_factors.py cassé - rate limiting)

### P2
- Admin: AdminUnitsTab.jsx pour gérer dimensions et conversions
- Admin: champs enrichis dans AdminFactorsTab.jsx

### P3
- Refactoring GuidedEntryModal.js (800+ lignes)
- Notifications toast, skeleton loaders
- Audit Trail
- Rapports exportables (PDF/Excel)

## Credentials de test
- Email: newtest@x.com / Password: test123

## Intégrations 3rd party
- recharts, framer-motion, fuse.js, pytest, SMTP (Infomaniak), emergentintegrations (LLMs)
