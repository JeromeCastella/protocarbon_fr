# Backlog — Amélioration de la saisie produits

_Dernière mise à jour : 2026-03-02_

---

## Objectifs principaux

| # | Objectif | Périmètre |
|---|---|---|
| O1 | **Épurer les fiches produits** — Les cartes sont surchargées, l'information clé doit s'imposer en un coup d'œil | `Products.js` |
| O2 | **Fiabiliser le wizard de saisie** — Valider, guider, empêcher la perte de données | `ProductWizard.js` |
| O3 | **Aligner le cycle de vie sur le GHG Protocol** — Ajouter la fabrication pour les produits finis, les émissions amont des matières | `ProductWizard.js`, `server.py` |
| O4 | **Améliorer la gestion des ventes** — Lier les ventes aux exercices fiscaux, permettre des quantités décimales, historique éditable | `ProductSaleModal.js`, `server.py` |
| O5 | **Supprimer les incohérences techniques** — Facteurs par défaut dupliqués, recyclabilité non utilisée, absence d'i18n | `ProductWizard.js`, `server.py` |

---

## O1 — Épurer les fiches produits (cartes)

### Vision cible des cartes

```
┌─────────────────────────────────────────┐
│  Nom du produit               [···]     │  ← menu actions (éditer, dupliquer, supprimer)
│  Produit fini · 5 ans                   │
├─────────────────────────────────────────┤
│                                         │
│   12.450 kgCO₂e / unité                │  ← valeur clé, grande, bien lisible
│                                         │
│  ██████████░░░░▒▒▒▒  ← barre composée  │
│  Matières  Usage  Fin de vie            │
│                                         │
├─────────────────────────────────────────┤
│  3 ventes · 1.24 tCO₂e générées        │
│  [+ Enregistrer une vente]              │
└─────────────────────────────────────────┘
```

### Actions

- [ ] **O1-A1** : Supprimer le bandeau gradient coloré en en-tête de carte — remplacer par un en-tête neutre (fond card standard) avec juste le nom et un tag de type (badge `Fini` / `Semi-fini`)
- [ ] **O1-A2** : Retirer les lignes détail "Transformation / Utilisation / Fin de vie" de la carte — ces données passent dans un panneau détail ou tooltip
- [ ] **O1-A3** : Mettre la valeur `total_emissions_per_unit` comme élément visuel dominant de la carte (grande taille, couleur neutre sobre)
- [ ] **O1-A4** : Ajouter une barre de décomposition visuelle en 3 segments colorés (matières/fabrication en orange, usage en vert, fin de vie en bleu) proportionnelle aux émissions — afficher les % au survol
- [ ] **O1-A5** : Regrouper les actions (éditer, dupliquer, supprimer) dans un menu `···` (dropdown) pour ne pas surcharger visuellement
- [ ] **O1-A6** : Placer "Enregistrer une vente" comme lien texte discret en bas de carte, pas un bouton pleine largeur vert
- [ ] **O1-A7** : Afficher les infos de ventes de façon condensée : `3 ventes · 1.24 tCO₂e` sur une seule ligne
- [ ] **O1-A8** : Permettre à l'utilisateur d'accéder au détail complet (breakdown, liste des matières, historique des ventes) via un clic sur la carte qui ouvre un panneau latéral ou une modale de lecture

---

## O2 — Fiabiliser le wizard de saisie

### Actions

**Validation**
- [ ] **O2-A1** : Ajouter validation à l'étape 1 : nom obligatoire (déjà fait), avertissement si `lifespan_years` ≤ 0
- [ ] **O2-A2** : Ajouter validation à l'étape 2 : si au moins une matière est ajoutée, vérifier que `weight_kg > 0` et qu'un facteur d'émission est sélectionné avant de pouvoir avancer
- [ ] **O2-A3** : Ajouter validation à l'étape 4 (usage) : si une valeur de consommation > 0 est saisie sans facteur sélectionné, afficher un avertissement (pas bloquant) indiquant que le facteur par défaut sera utilisé

**Navigation**
- [ ] **O2-A4** : Rendre les étapes déjà complétées cliquables dans l'indicateur de progression (navigation libre en arrière)
- [ ] **O2-A5** : Ajouter un bouton "Ignorer cette étape" sur les étapes optionnelles (Transformation, Usage) pour les produits où ces phases ne s'appliquent pas

**Prévention de perte de données**
- [ ] **O2-A6** : Afficher une modale de confirmation ("Des données non sauvegardées seront perdues. Quitter quand même ?") lorsque l'utilisateur clique sur la croix ou en dehors du wizard
- [ ] **O2-A7** : Sauvegarder l'état du formulaire en `localStorage` sous une clé temporaire pour permettre la reprise après rechargement accidentel

**Feedback**
- [ ] **O2-A8** : Afficher une notification d'erreur visible (toast ou inline) si l'appel API échoue au moment de la sauvegarde — actuellement silencieux (`console.error` uniquement)
- [ ] **O2-A9** : Afficher la contribution carbone de chaque matière (kgCO₂e) inline dans l'étape 2, recalculée à chaque changement de poids ou de facteur
- [ ] **O2-A10** : Afficher le nom de la matière sélectionnée comme titre de la ligne matière (au lieu de "Matière 1", "Matière 2")

**Ergonomie**
- [ ] **O2-A11** : Ajouter un système opt-in pour les catégories d'énergie à l'étape Usage — afficher des tuiles (Électricité / Combustible / Carburant / Réfrigérants) à cocher ; ne déployer le formulaire que pour les catégories cochées
- [ ] **O2-A12** : Ajouter un bouton "Dupliquer ce produit" dans le menu actions de la carte pour cloner une fiche existante et la modifier

---

## O3 — Aligner le cycle de vie sur le GHG Protocol

### Actions

**Fabrication des produits finis**
- [ ] **O3-A1** : Ajouter une étape "Fabrication" dans le wizard pour les produits finis (actuellement la transformation n'existe que pour `semi_finished`) — permettre de saisir consommations électricité et combustible de fabrication
- [ ] **O3-A2** : Modifier `ProductCreateEnhanced` dans `server.py` pour accepter un champ `fabrication: Optional[TransformationEnergy]` indépendant de `transformation`
- [ ] **O3-A3** : Modifier `calculate_product_emissions` dans `server.py` pour intégrer les émissions de fabrication dans `transformation_emissions` (ou créer un champ `fabrication_emissions` dédié)
- [ ] **O3-A4** : Mettre à jour la barre de décomposition visuelle (O1-A4) pour inclure la fabrication si applicable

**Émissions amont des matières**
- [ ] **O3-A5** : Activer le calcul des émissions amont des matières : le facteur d'émission sélectionné à l'étape 2 représente l'extraction/production de la matière — s'assurer que ce calcul (`weight_kg × emission_factor.value`) est bien stocké et affiché séparément de la fin de vie
- [ ] **O3-A6** : Dans `calculate_product_emissions`, ajouter un champ `materials_emissions` (émissions amont matières) distinct de `disposal_emissions` (fin de vie)
- [ ] **O3-A7** : Mettre à jour la card et le résumé du wizard pour afficher `materials_emissions` comme phase propre du cycle de vie

**Recyclabilité**
- [ ] **O3-A8** : Décider et documenter si `recyclability_percent` réduit les `disposal_emissions` — si oui, implémenter `disposal_emissions × (1 - recyclability_percent/100)` dans le backend et aligner la preview frontend
- [ ] **O3-A9** : Si `recyclability_percent` n'est pas utilisé dans le calcul, supprimer le champ du formulaire pour éviter de tromper l'utilisateur

---

## O4 — Améliorer la gestion des ventes

### Actions

**Lien avec les exercices fiscaux**
- [ ] **O4-A1** : Dans `ProductSaleModal`, remplacer le champ `year` (input libre) par un sélecteur des exercices fiscaux actifs de l'entreprise (appel `GET /api/fiscal-years`)
- [ ] **O4-A2** : Dans le backend, lors d'un enregistrement de vente, vérifier que l'exercice fiscal cible n'est pas clôturé — retourner une erreur 400 explicite si c'est le cas

**Quantités décimales**
- [ ] **O4-A3** : Modifier l'input `quantity` dans `ProductSaleModal` pour accepter les décimales (`step="0.001"`, `parseFloat` au lieu de `parseInt`) lorsque l'unité du produit est `kg`, `L`, `m2` ou `m3`
- [ ] **O4-A4** : Côté backend, changer `quantity: int` en `quantity: float` dans `ProductSaleFromCategory`

**Historique des ventes**
- [ ] **O4-A5** : Ajouter un endpoint `DELETE /api/products/{product_id}/sales/{sale_index}` dans le backend pour permettre la suppression d'une vente individuelle
- [ ] **O4-A6** : Dans le panneau détail produit (O1-A8), afficher la liste des ventes enregistrées (exercice fiscal, quantité, tCO₂e) avec possibilité de supprimer chaque ligne
- [ ] **O4-A7** : Ajouter un lien de navigation vers les activités Scope 3 Aval générées pour une vente donnée (traçabilité)

---

## O5 — Supprimer les incohérences techniques

### Actions

**Facteurs par défaut dupliqués**
- [ ] **O5-A1** : Centraliser les facteurs par défaut (électricité France 0.0569, gaz naturel 0.205, diesel 2.68, R-134a 1430) dans une constante partagée côté backend — supprimer les valeurs hardcodées dans `calculate_product_emissions`
- [ ] **O5-A2** : Créer un endpoint `GET /api/emission-factors/defaults` qui renvoie ces valeurs par défaut — le frontend les charge une fois et les utilise dans `calculateEmissionsPreview` au lieu de les dupliquer

**Internationalisation**
- [ ] **O5-A3** : Ajouter `useLanguage` dans `ProductWizard.js` et `ProductSaleModal.js`
- [ ] **O5-A4** : Déplacer tous les libellés hardcodés en français de ces composants vers `fr.json` et `de.json` (section `products`)
- [ ] **O5-A5** : Ajouter dans `fr.json` les clés manquantes : wizard steps, labels d'énergie, labels matières, messages d'erreur et de confirmation

**Produits legacy**
- [ ] **O5-A6** : Rendre les produits "fiche simple" (`is_enhanced = false`) éditables — afficher le bouton éditer et ouvrir le wizard en mode simplifié (seulement l'étape 1 avec les 3 champs manuels)
- [ ] **O5-A7** : Proposer une action "Migrer vers fiche enrichie" sur les produits legacy pour les convertir en `is_enhanced` sans perte de données

---

## Ordre d'implémentation suggéré

```
Phase 1 — Quick wins visuels et UX (impact immédiat, faible risque)
  O1-A1 → O1-A8   Refonte des cartes produit
  O2-A6           Confirmation avant fermeture wizard
  O2-A8           Toast d'erreur API
  O2-A9           Contribution carbone par matière (inline)
  O2-A10          Nom de matière comme titre de ligne

Phase 2 — Fiabilité du wizard
  O2-A1 → O2-A5   Validation par étape
  O2-A4           Navigation libre entre étapes
  O2-A11          Opt-in catégories d'énergie
  O2-A12          Duplication de produit

Phase 3 — Ventes et cohérence données
  O4-A1 → O4-A3   Sélecteur exercice fiscal + quantités décimales
  O4-A4           Backend quantity float
  O4-A5 → O4-A7   Historique des ventes

Phase 4 — GHG Protocol et technique
  O3-A1 → O3-A4   Fabrication produits finis
  O3-A5 → O3-A7   Émissions amont matières
  O3-A8 → O3-A9   Recyclabilité
  O5-A1 → O5-A7   Dettes techniques
```
