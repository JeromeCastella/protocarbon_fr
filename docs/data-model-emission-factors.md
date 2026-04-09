# Modèle de données — Facteurs d'émission, sous-catégories et catégories

> Document basé sur l'extraction de la base de données (16 mars 2026) et le code de production.

---

## Vue d'ensemble des relations

```
categories  (22 entrées)
     ▲
     │  N-to-N : une sous-catégorie pointe vers plusieurs catégories GHG
     │
subcategories  (69 entrées)
     ▲
     │  champ subcategory = code de sous-catégorie
     │
emission_factors  (1 191 entrées)
     │
     │  impacts[] : 1 à 3 impacts par FE (scopes distincts)
     ▼
activities
  scope         → normalisé à l'écriture (scope3_amont / scope3_aval)
  factor_snapshot → copie figée du FE au moment de la saisie
  group_id      → relie les activités issues du même FE multi-impact
```

**Relation sous-catégories ↔ catégories : many-to-many.** Une même sous-catégorie (ex. `aerien`) peut apparaître dans plusieurs catégories GHG. Cela permet à un FE de s'afficher dans plusieurs contextes de saisie selon la catégorie choisie par l'utilisateur.

---

## 1. La collection `categories`

Référentiel de premier niveau. 22 catégories, initialisées au démarrage via `get_default_categories()`.

```json
{
  "_id": "ObjectId",
  "scope": "scope3_amont",
  "code": "biens_services_achetes",
  "name_fr": "Biens et services achetés",
  "name_de": "Gekaufte Waren und Dienstleistungen",
  "icon": "shopping-cart",
  "color": "#8B5CF6"
}
```

### Inventaire (22 catégories)

| Scope | Code | Libellé FR |
|-------|------|-----------|
| scope1 | `combustion_mobile` | Combustion mobile |
| scope1 | `combustion_fixe` | Combustion fixe |
| scope1 | `emissions_procedes` | Émissions de procédés |
| scope1 | `emissions_fugitives` | Émissions fugitives |
| scope2 | `electricite` | Électricité |
| scope2 | `chaleur_vapeur` | Chaleur et vapeur |
| scope2 | `refroidissement` | Refroidissement |
| scope3_amont | `biens_services_achetes` | Biens et services achetés |
| scope3_amont | `biens_equipement` | Biens d'équipement |
| scope3_amont | `activites_combustibles_energie` | Activités liées aux combustibles et à l'énergie |
| scope3_amont | `transport_distribution_amont` | Transport et distribution amont |
| scope3_amont | `dechets_operations` | Déchets générés par les opérations |
| scope3_amont | `deplacements_professionnels` | Déplacements professionnels |
| scope3_amont | `deplacements_domicile_travail` | Déplacements pendulaires des employés |
| scope3_amont | `actifs_loues_amont` | Actifs loués en amont |
| scope3_aval | `transport_distribution_aval` | Transport et distribution aval |
| scope3_aval | `transformation_produits` | Transformation des produits vendus |
| scope3_aval | `utilisation_produits` | Utilisation des produits vendus |
| scope3_aval | `fin_vie_produits` | Traitement en fin de vie des produits vendus |
| scope3_aval | `actifs_loues_aval` | Actifs loués en aval |
| scope3_aval | `franchises` | Franchises |
| scope3_aval | `investissements` | Investissements |

---

## 2. La collection `subcategories`

### Structure d'un document

```json
{
  "id": "698418f3c1a4e9f26cd270fd",
  "code": "aerien",
  "name_fr": "Aérien",
  "name_de": "Luftverkehr",
  "categories": [
    "deplacements_domicile_travail",
    "deplacements_professionnels",
    "transport_distribution_aval",
    "transport_distribution_amont",
    "combustion_mobile"
  ],
  "icon": "circle",
  "order": 0,
  "created_at": "2026-01-30T12:26:23.319281+00:00",
  "updated_at": "2026-03-16T05:31:52.658054+00:00"
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Identifiant MongoDB |
| `code` | string | Identifiant fonctionnel unique. Valeur stockée dans `emission_factors.subcategory` |
| `name_fr` / `name_de` | string | Libellés traduits |
| `categories` | string[] | Codes des catégories GHG associées (relation N-to-N) |
| `icon` | string | Icône d'affichage (actuellement toutes à `"circle"`) |
| `order` | int | Ordre d'affichage |
| `created_at` / `updated_at` | datetime | Horodatages |

### Modèle Pydantic (`SubcategoryCreate`)

```python
SubcategoryCreate:  code, name_fr, name_de, categories: List[str],
                    icon="circle", order=0
SubcategoryUpdate:  tous les champs optionnels
```

### Statistiques et inventaire

- **69 sous-catégories** au total
- **63 sur 69** rattachées à plusieurs catégories GHG (relation N-to-N effective)

| Code | Libellé FR | Catégories GHG associées |
|------|-----------|--------------------------|
| `aerien` | Aérien | combustion_mobile, deplacements_domicile_travail, deplacements_professionnels, transport_distribution_amont, transport_distribution_aval |
| `alimentation` | Alimentation | biens_services_achetes |
| `autres_dechets` | Autres déchets | dechets_operations |
| `autres_materiaux_massifs` | Autres matériaux massifs | biens_equipement, biens_services_achetes |
| `beton` | Béton | biens_equipement, biens_services_achetes |
| `bois_et_produits_en_bois` | Bois et produits en bois | biens_equipement, biens_services_achetes |
| `building_and_construction_materials` | Matériaux de construction | biens_equipement, biens_services_achetes |
| `building_elements_and_structures` | Éléments techniques du bâtiment | dechets_operations, fin_vie_produits |
| `carburants` | Carburants | actifs_loues_amont, actifs_loues_aval, combustion_mobile, franchises, investissements, transformation_produits, transport_distribution_amont, utilisation_produits |
| `chaleur_a_distance` | Chaleur à distance | chaleur_vapeur |
| `chaleur_pac` | Chaleur PAC | chaleur_vapeur |
| `colles_et_masses_de_jointoiement` | Colles et masses de jointoiement | biens_equipement, biens_services_achetes |
| `combine` | Combiné | deplacements_domicile_travail, deplacements_professionnels, transport_distribution_amont, transport_distribution_aval |
| `combustibles` | Combustibles | actifs_loues_amont, actifs_loues_aval, combustion_fixe, franchises, investissements, transformation_produits, utilisation_produits |
| `construction` | Construction | biens_equipement, biens_services_achetes |
| `construction_waste` | Déchets de chantier | dechets_operations, fin_vie_produits |
| `dechets_nucleaires` | Déchets nucléaires | dechets_operations |
| `deplacements_generique` | Déplacements génériques | deplacements_domicile_travail, deplacements_professionnels |
| `district_cooling` | Réseau de froid | refroidissement |
| `electrical_components` | Composants électriques | biens_equipement, biens_services_achetes |
| `electricite` | Électricité | actifs_loues_amont, actifs_loues_aval, electricite, franchises, investissements, transformation_produits, utilisation_produits |
| `electronics_waste` | Déchets électroniques | dechets_operations, fin_vie_produits |
| `enduits_et_revetements` | Enduits et revêtements | biens_equipement, biens_services_achetes |
| `equipements_et_technologies` | Équipements et technologies | biens_equipement, biens_services_achetes |
| `fenetre_et_facades_verre_metal` | Fenêtres et façades verre/métal | biens_equipement, biens_services_achetes |
| `ferroviaire` | Ferroviaire | deplacements_domicile_travail, deplacements_professionnels, transport_distribution_amont, transport_distribution_aval |
| `flooring_materials` | Revêtements de sol | biens_equipement, biens_services_achetes |
| `fluvial` | Fluvial | transport_distribution_amont, transport_distribution_aval |
| `furniture_and_fixtures` | Mobilier et équipements fixes | biens_equipement, biens_services_achetes |
| `glass_and_windows` | Verre et vitrages | biens_equipement, biens_services_achetes |
| `hors_route` | Hors route | combustion_mobile |
| `impoundment` | Stockage en bassin | dechets_operations |
| `installations_de_chauffage` | Installations de chauffage | biens_equipement, biens_services_achetes |
| `installations_electriques` | Installations électriques | biens_equipement, biens_services_achetes |
| `installations_et_meubles_de_cuisine` | Installations et meubles de cuisine | biens_equipement, biens_services_achetes |
| `installations_sanitaires` | Installations sanitaires | biens_equipement, biens_services_achetes |
| `insulation_and_waterproofing` | Isolation et étanchéité | biens_equipement, biens_services_achetes |
| `landfarming` | Épandage (landfarming) | dechets_operations |
| `les_detancheite_et_feuilles_de_protection` | Feuilles d'étanchéité et de protection | biens_equipement, biens_services_achetes |
| `logiciels` | Logiciels | biens_services_achetes |
| `matieres_plastique` | Matières plastiques | biens_equipement, biens_services_achetes |
| `metal_materials` | Matériaux métalliques | biens_equipement, biens_services_achetes |
| `mineral_construction_materials` | Matériaux de construction minéraux | biens_equipement, biens_services_achetes |
| `mobilite_douce` | Mobilité douce | deplacements_domicile_travail, deplacements_professionnels |
| `mortiers_et_enduits` | Mortiers et enduits | biens_equipement, biens_services_achetes |
| `pierres_de_taille` | Pierres de taille | biens_equipement, biens_services_achetes |
| `plastic_and_rubber_materials` | Plastiques et caoutchoucs | biens_equipement, biens_services_achetes |
| `portes` | Portes | biens_equipement, biens_services_achetes |
| `produits` | Produits | biens_equipement, biens_services_achetes |
| `produits_chimiques_et_combustibles` | Produits chimiques et combustibles | biens_equipement, biens_services_achetes |
| `produits_disolation_thermique` | Produits d'isolation thermique | biens_equipement, biens_services_achetes |
| `produits_en_metal` | Produits en métal | biens_equipement, biens_services_achetes |
| `recycling` | Recyclage | dechets_operations, fin_vie_produits |
| `refrigerants` | Réfrigérants | actifs_loues_amont, actifs_loues_aval, emissions_fugitives, franchises, investissements, utilisation_produits |
| `revetements_de_sol` | Revêtements de sol | biens_equipement, biens_services_achetes |
| `route` | Route | deplacements_domicile_travail, deplacements_professionnels, transport_distribution_amont, transport_distribution_aval |
| `route_transport_individuel` | Route — transport individuel | deplacements_domicile_travail, deplacements_professionnels |
| `route_transports_en_communs` | Route — transports en commun | deplacements_domicile_travail, deplacements_professionnels |
| `services` | Services | biens_services_achetes |
| `special_waste_types` | Types de déchets spéciaux | dechets_operations, fin_vie_produits |
| `synthetic_and_composite_materials` | Matériaux synthétiques et composites | biens_equipement, biens_services_achetes |
| `transport_waste` | Déchets de transport | dechets_operations |
| `travaux_de_preparation` | Travaux de préparation | biens_equipement, biens_services_achetes |
| `tuyaux` | Tuyaux | biens_equipement, biens_services_achetes |
| `underground_deposit` | Dépôt souterrain | dechets_operations |
| `ventilation` | Ventilation | biens_equipement, biens_services_achetes |
| `vetements_et_textiles` | Vêtements et textiles | biens_services_achetes |
| `wastewater_treatment` | Traitement des eaux usées | dechets_operations |
| `wood_derived_materials` | Matériaux dérivés du bois | biens_equipement, biens_services_achetes |

---

## 3. La collection `emission_factors`

### Statistiques générales

| Indicateur | Valeur |
|-----------|--------|
| Nombre total de FE | **1 191** |
| FE avec plusieurs impacts (multi-scope) | **299** |
| FE soft-deleted | **0** |
| Total d'impacts | **2 038** |
| FE sans source renseignée | **283 (24 %)** |

### Sources de données

| Source | Nb FE | Description |
|--------|-------|-------------|
| **KBOB** | 314 | Données suisses bâtiment et construction |
| *(manquante)* | 283 | **À identifier — problème de traçabilité** |
| **Mobitool** | 251 | Outil suisse de calcul d'empreinte transport |
| **UVEK Database** | 183 | Département fédéral de l'environnement (CH) |
| **Environmental Impacts of Swiss Consumption** | 60 | Publication OFEV |
| **BAFU** | 47 | Bundesamt für Umwelt (= OFEV) |
| **CO2-Emissionsfaktoren Treibhausgasinventar CH** | 23 | Inventaire suisse des GES |
| **AR5 GIEC** | 16 | Potentiels de réchauffement global (réfrigérants) |
| **mobitool v3** | 12 | Version 3 de Mobitool |
| Autres | 2 | |

> L'ensemble du référentiel est **d'origine suisse** (KBOB, Mobitool, UVEK, BAFU/OFEV). Aucun FE ADEME en base de production.

### Structure d'un document

```json
{
  "id": "698418f3c1a4e9f26cd27156",
  "name_fr": "Hydroélectricité",
  "name_de": "Wasserkraft",
  "name_simple_fr": "Énergie hydroélectrique",
  "name_simple_de": "Wasserkraft",
  "subcategory": "electricite",
  "input_units": ["kWh"],
  "default_unit": "kWh",
  "unit_conversions": {},
  "impacts": [
    { "scope": "scope2",   "value": 0.0008832,  "unit": "kgCO2e/kWh" },
    { "scope": "scope3_3", "value": 0.00388983, "unit": "kgCO2e/kWh" },
    { "scope": "scope3",   "value": 0.0008832,  "unit": "kgCO2e/kWh" }
  ],
  "source": "BAFU",
  "region": "Suisse",
  "year": 2024,
  "valid_from_year": 2024,
  "description_fr": "Énergie produite par l'eau en mouvement, comme dans les barrages.",
  "description_de": "Energie, die durch bewegendes Wasser erzeugt wird, wie in Staudämmen.",
  "usage_hint_fr": "Utilisez ce facteur pour évaluer l'énergie électrique.",
  "usage_hint_de": "Verwenden Sie diesen Faktor zur Bewertung von Strom.",
  "tags": ["barrage", "hydraulique", "electricite"],
  "search_tags": ["énergie renouvelable", "hydroélectricité", "barrage"],
  "popularity_score": 85,
  "version": 1,
  "factor_version": 1,
  "is_correction": false,
  "replaced_by": null,
  "previous_version_id": null,
  "deleted_at": null,
  "created_at": "2026-01-30T12:26:23.319281+00:00",
  "change_history": [
    {
      "version": 1,
      "changed_at": "2026-01-30T12:26:23.319281+00:00",
      "changed_by": "xlsx_import",
      "reason": "Import initial depuis le fichier Excel fourni",
      "is_correction": false
    }
  ]
}
```

### Description de tous les champs

| Champ | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Identifiant MongoDB |
| `name_fr` / `name_de` | string | Nom complet bilingue |
| `name_simple_fr` / `name_simple_de` | string | Nom court pour affichage condensé |
| `subcategory` | string | Code de la sous-catégorie parente (jointure vers `subcategories.code`) |
| `input_units` | string[] | Unités acceptées en saisie (ex. `["kWh", "MWh"]`) |
| `default_unit` | string | Unité interne de référence pour le calcul |
| `unit_conversions` | object | Facteurs de conversion inline (ex. `{"MWh_to_kWh": 1000}`) |
| `impacts` | object[] | Liste des impacts carbone par scope |
| `source` | string | Organisme source |
| `region` | string | Zone géographique de référence |
| `year` | int | Année de la valeur de référence |
| `valid_from_year` | int | Année à partir de laquelle ce FE est applicable |
| `description_fr` / `description_de` | string | Description pédagogique bilingue |
| `usage_hint_fr` / `usage_hint_de` | string | Conseil d'utilisation bilingue |
| `tags` | string[] | Mots-clés techniques |
| `search_tags` | string[] | Mots-clés orientés recherche utilisateur |
| `popularity_score` | int | Score de tri dans les résultats (0–100) |
| `version` | int | Numéro de version du document |
| `factor_version` | int | Numéro de version de la valeur du FE |
| `is_correction` | bool | `true` si ce FE corrige un FE précédent |
| `replaced_by` | ObjectId? | ID du FE successeur (soft-deprecation) |
| `previous_version_id` | ObjectId? | ID de la version précédente |
| `deleted_at` | datetime? | Soft-delete. `null` = actif |
| `created_at` / `updated_at` | datetime | Horodatages |
| `change_history` | object[] | Journal des modifications (version, auteur, raison) |

### Modèle Pydantic (`EmissionFactorV2Create`)

```python
EmissionFactorV2Create:
  name_fr, name_de           # Noms bilingues
  subcategory: str           # Code sous-catégorie
  input_units: List[str]     # Unités acceptées
  default_unit: str          # Unité de référence
  impacts: List[EmissionImpact]
  unit_conversions: Dict[str, float] = {}
  tags: List[str] = []
  source: str = "OFEV"
  region: str = "Suisse"
  year: int = 2024
  name_simple_fr, name_simple_de   # Noms courts (optionnels)
  description_fr, description_de   # Descriptions (optionnelles)
  search_tags: List[str] = []
  usage_hint_fr, usage_hint_de     # Conseils (optionnels)
  popularity_score: int = 50
```

> L'ancien modèle `EmissionFactorCreate` (format simple) est conservé dans le code pour rétrocompatibilité mais n'est plus utilisé pour les FE réels.

---

## 4. Les impacts et la gestion des scopes

### Scopes dans la base de données

| Scope dans les FE | Nb d'impacts | Signification |
|-------------------|-------------|---------------|
| `scope3` | 1 138 | Scope 3 générique — mappé vers `scope3_amont` ou `scope3_aval` selon la catégorie |
| `scope1` | 325 | Émissions directes |
| `scope3_3` | 298 | Catégorie 3.3 GHG Protocol : amont énergie → toujours `scope3_amont` |
| `scope2` | 277 | Émissions indirectes (électricité, chaleur) |

### Structure d'un impact

```json
{ "scope": "scope3", "value": 0.159, "unit": "kgCO2e/kg" }
```

> **Note** : les impacts en base ne contiennent que `scope`, `value`, `unit`. Il n'y a pas de champ `category`. Le modèle Pydantic `EmissionImpact` inclut un champ `category` qui n'est pas présent dans les données réelles — c'est une discordance à documenter.

### Règles de filtrage des impacts (`apply_business_rules`)

Lors de la création d'une activité, le moteur ne retient pas tous les impacts du FE — il filtre selon le contexte de saisie :

| Contexte de saisie | Impacts retenus |
|-------------------|-----------------|
| Scope 1 ou Scope 2 | `scope1`, `scope2`, `scope3_3` |
| Catégorie `activites_combustibles_energie` | `scope3_3` uniquement |
| Autre Scope 3 | `scope3` uniquement |

Un impact avec `value = 0` est toujours exclu.

### Normalisation des scopes (`normalize_scope_for_reporting`)

Module `services/scope_mapping.py`. Mappe les scopes bruts vers les 4 scopes de reporting :

```
scope1       → scope1
scope2       → scope2
scope3_3     → scope3_amont  (catégorie 3.3 = amont énergie)
scope3       → scope3_amont  si category_id ∈ SCOPE3_AMONT_CATEGORIES
             → scope3_aval   si category_id ∈ SCOPE3_AVAL_CATEGORIES
             → scope3_amont  par défaut si catégorie inconnue
scope3_amont → scope3_amont  (pass-through)
scope3_aval  → scope3_aval   (pass-through)
```

**Catégories Scope 3 Amont** : `biens_services_achetes`, `biens_equipement`, `activites_combustibles_energie`, `transport_distribution_amont`, `dechets_operations`, `deplacements_professionnels`, `deplacements_domicile_travail`, `actifs_loues_amont`

**Catégories Scope 3 Aval** : `transport_distribution_aval`, `transformation_produits`, `utilisation_produits`, `fin_vie_produits`, `actifs_loues_aval`, `franchises`, `investissements`

---

## 5. Le moteur de création d'activités

### Flux complet (`POST /activities`)

```
1. Utilisateur saisit :
   - category_id    : ex. "biens_services_achetes"   (sélection dans l'UI)
   - scope          : ex. "scope3_amont"             (déduit de la catégorie)
   - subcategory_id : ex. "beton"
   - emission_factor_id : ObjectId du FE
   - quantity       : 500
   - unit           : "t"

2. Récupération du FE en base :
   - default_unit = "kg"
   - impacts = [{scope: "scope3", value: 0.159}, {scope: "scope3_3", value: 0.021}]

3. Conversion d'unité si nécessaire :
   t → kg : quantity = 500 × 1000 = 500 000 kg  (via unit_conversions du FE)

4. Filtrage des impacts (apply_business_rules) :
   - Saisie Scope 3 (autre que 3.3) → garder uniquement scope3
   - Impact scope3_3 exclu
   → filtered_impacts = [{scope: "scope3", value: 0.159}]

5. Génération d'un group_id (même si 1 seul impact ici)

6. Pour chaque impact filtré → create_activity_for_impact() :
   - emissions = 500 000 × 0.159 = 79 500 kgCO2e
   - impact_scope = normalize_scope("scope3") = "scope3"
   - display_category = activity.category_id = "biens_services_achetes"
   - stored_scope = normalize_scope_for_reporting("scope3", "biens_services_achetes")
                  = "scope3_amont"  ← normalisé à l'ÉCRITURE

7. Document stocké dans activities :
   {
     scope: "scope3_amont",          ← scope normalisé
     category_id: "biens_services_achetes",
     entry_scope: "scope3_amont",    ← contexte de saisie original
     entry_category: "biens_services_achetes",
     group_id: "grp_abc123",
     group_index: 0,
     group_size: 1,
     emissions: 79500,
     factor_snapshot: { ... },       ← copie figée du FE
     original_quantity: 500,
     original_unit: "t",
     conversion_factor: 1000
   }
```

### Structure d'une activité en base

| Champ | Type | Description |
|-------|------|-------------|
| `scope` | string | Scope normalisé (`scope1`, `scope2`, `scope3_amont`, `scope3_aval`) |
| `category_id` | string | Catégorie GHG d'affichage |
| `subcategory_id` | string? | Sous-catégorie choisie |
| `entry_scope` | string | Scope de saisie original (traçabilité) |
| `entry_category` | string | Catégorie de saisie originale (traçabilité) |
| `group_id` | string? | Identifiant du groupe multi-impacts |
| `group_index` | int | Position dans le groupe (0-based) |
| `group_size` | int | Nombre total d'activités dans le groupe |
| `impact_value` | float | Valeur de l'impact utilisé |
| `impact_unit` | string | Unité de l'impact |
| `name` | string | Libellé saisi |
| `quantity` | float | Quantité (en `default_unit` du FE) |
| `unit` | string | Unité finale (après conversion) |
| `original_quantity` | float | Quantité saisie par l'utilisateur |
| `original_unit` | string | Unité saisie par l'utilisateur |
| `conversion_factor` | float? | Facteur de conversion appliqué |
| `emission_factor_id` | ObjectId? | Référence vers le FE |
| `factor_snapshot` | object | Copie figée du FE à la date de saisie |
| `manual_emission_factor` | float? | FE saisi manuellement (si pas de FE en base) |
| `emissions` | float | Émissions calculées (kgCO2e) |
| `calculated_emissions` | float | Alias de emissions |
| `fiscal_year_id` | string? | Exercice fiscal rattaché |
| `date` | string | Date de l'activité (YYYY-MM-DD) |
| `tenant_id` | string | Isolation multi-tenant |
| `company_id` | string | ID de la société |
| `comments` | string? | Commentaires libres |
| `created_at` / `updated_at` | datetime | Horodatages |

### Gestion des groupes multi-impacts

Quand un FE génère plusieurs impacts après filtrage, une activité est créée par impact, toutes liées par `group_id`. Des endpoints dédiés permettent de manipuler le groupe comme une unité :

| Endpoint | Action |
|----------|--------|
| `GET /activities/groups/{group_id}` | Récupère toutes les activités du groupe |
| `PUT /activities/groups/{group_id}` | Met à jour le groupe (changement de quantité = mise à jour proportionnelle, changement de FE = suppression et recréation) |
| `DELETE /activities/groups/{group_id}` | Supprime toutes les activités du groupe |

---

## 6. La collection `unit_conversions`

Référentiel de conversions d'unités global (distinct des `unit_conversions` inline dans chaque FE).

```json
{
  "id": "ObjectId",
  "from_unit": "km",
  "to_unit": "L",
  "factor": 0.07,
  "description_fr": "Consommation moyenne voiture",
  "description_de": "Durchschnittlicher Autoverbrauch",
  "created_at": "2026-01-24T06:56:04.248602+00:00"
}
```

### 11 conversions disponibles

| De | Vers | Facteur | Usage |
|----|------|---------|-------|
| `km` | `L` | 0.07 | Voiture thermique (7L/100km) |
| `km` | `kWh` | 0.2 | Véhicule électrique |
| `passager.km` | `km` | 1 | Passager-kilomètre |
| `MWh` | `kWh` | 1 000 | Énergie |
| `GJ` | `kWh` | 277.78 | Énergie |
| `tep` | `kWh` | 11 630 | Tonne équivalent pétrole |
| `t` | `kg` | 1 000 | Masse |
| `g` | `kg` | 0.001 | Masse |
| `m3` | `L` | 1 000 | Volume |
| `kCHF` | `CHF` | 1 000 | Monétaire CHF |
| `k€` | `€` | 1 000 | Monétaire EUR |

---

