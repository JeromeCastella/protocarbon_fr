from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['carbon_tracker']

# === 1. Supprimer les 20 sous-catégories FR vides ===
empty_fr_codes = [
    'autres_dechets', 'dechets_agricoles', 'dechets_electroniques',
    'dechets_equipements_electriques', 'dechets_materiaux_synthetiques',
    'dechets_mineraux', 'dechets_nucleaires', 'dechets_plastiques',
    'dechets_speciaux', 'eaux_usees', 'elimination_bois',
    'elimination_elements_techniques_du_batiment', 'elimination_materiaux_de_construction',
    'elimination_materiel_disolation', 'elimination_metaux',
    'elimination_mobilier_et_sols', 'elimination_moyens_de_transport',
    'elimination_revetements_de_sols', 'elimination_verres_et_fenetres',
    'recyclage'
]
r1 = db['subcategories'].delete_many({'code': {'$in': empty_fr_codes}})
print(f'1. Supprime {r1.deleted_count} sous-categories FR vides')

# === 2. Supprimer le doublon dechets_de_construction (1 EF, remplace par construction_waste 66 EF) ===
r2 = db['subcategories'].delete_one({'code': 'dechets_de_construction'})
print(f'2. Supprime doublon dechets_de_construction: {r2.deleted_count}')
# Migrer le 1 EF orphelin vers construction_waste
r2b = db['emission_factors'].update_many(
    {'subcategory': 'dechets_de_construction'},
    {'$set': {'subcategory': 'construction_waste'}}
)
print(f'   Migre {r2b.modified_count} EF vers construction_waste')

# === 3. Traduire les 10 sous-categories EN ===
translations = [
    ('electrical_components', 'Composants electriques', 'Elektrische Komponenten'),
    ('electronics_waste', 'Dechets electroniques', 'Elektroschrott'),
    ('impoundment', 'Bassin de retenue', 'Ruckhaltebecken'),
    ('plastic_and_rubber_materials', 'Matieres plastiques et caoutchouc', 'Kunststoff- und Gummimaterialien'),
    ('special_waste_types', 'Dechets speciaux', 'Sonderabfalle'),
    ('synthetic_and_composite_materials', 'Materiaux synthetiques et composites', 'Synthetische und Verbundwerkstoffe'),
    ('transport_waste', 'Dechets de transport', 'Transportabfalle'),
    ('underground_deposit', 'Depot souterrain', 'Unterirdische Lagerung'),
    ('wastewater_treatment', 'Traitement des eaux usees', 'Abwasserbehandlung'),
    ('wood_derived_materials', 'Bois et derives', 'Holz und Holzwerkstoffe'),
]
translated = 0
for code, name_fr, name_de in translations:
    r = db['subcategories'].update_one(
        {'code': code},
        {'$set': {'name_fr': name_fr, 'name_de': name_de}}
    )
    translated += r.modified_count
print(f'3. Traduit {translated} sous-categories EN -> FR/DE')

# === 4. Creer district_cooling pour refroidissement ===
existing = db['subcategories'].find_one({'code': 'district_cooling'})
if not existing:
    db['subcategories'].insert_one({
        'code': 'district_cooling',
        'name_fr': 'Refroidissement a distance',
        'name_de': 'Fernkuhlung',
        'categories': ['refroidissement'],
        'icon': 'circle',
        'order': 0
    })
    print('4. Cree district_cooling pour refroidissement')
else:
    print('4. district_cooling existe deja')

# === 5. Corriger les 6 mappings suspects ===
for sub_code in ['route', 'route_transport_individuel', 'route_transports_en_communs']:
    r = db['subcategories'].update_one(
        {'code': sub_code},
        {'$pull': {'categories': {'$in': ['emissions_procedes', 'electricite']}}}
    )
    print(f'5. {sub_code}: retire {r.modified_count} mapping(s) suspect(s)')

# === BILAN ===
final_count = db['subcategories'].count_documents({})
print(f'\n=== RESULTAT: {final_count} sous-categories ===')
