from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017')
db = client['carbon_tracker']

categories = list(db['categories'].find({}, {'_id': 0}).sort([('scope', 1), ('code', 1)]))
subcategories = list(db['subcategories'].find({}, {'_id': 0}).sort('code', 1))
cat_map = {c['code']: c for c in categories}

print(f'=== STATS GLOBALES ===')
print(f'Categories: {len(categories)}')
print(f'Sous-categories: {len(subcategories)}')
print(f'Facteurs d\'emission: {db["emission_factors"].count_documents({})}')

# Missing translations
missing_de = [s for s in subcategories if not s.get('name_de') or s['name_de'].strip() == '']
missing_fr = [s for s in subcategories if not s.get('name_fr') or s['name_fr'].strip() == '']
print(f'Traduction DE manquante: {len(missing_de)}')
print(f'Traduction FR manquante: {len(missing_fr)}')

# Orphan subcategories
orphan_subs = [s for s in subcategories if not s.get('categories') or len(s['categories']) == 0]
print(f'Sous-categories orphelines: {len(orphan_subs)}')
for o in orphan_subs:
    print(f'  - {o["name_fr"]} ({o["code"]})')

# Broken links
broken_links = []
for sub in subcategories:
    for cat_code in sub.get('categories', []):
        if cat_code not in cat_map:
            broken_links.append({'sub': sub['code'], 'missing_cat': cat_code})
print(f'Liens casses: {len(broken_links)}')
for bl in broken_links:
    print(f'  - {bl["sub"]} -> {bl["missing_cat"]}')

# EF orphans
all_sub_codes = {s['code'] for s in subcategories}
ef_subcats = db['emission_factors'].distinct('subcategory')
orphan_efs = [s for s in ef_subcats if s not in all_sub_codes]
print(f'EF orphelins: {len(orphan_efs)}')
for oe in orphan_efs:
    count = db['emission_factors'].count_documents({'subcategory': oe})
    print(f'  - subcategory="{oe}" : {count} EF(s)')

# Subcategories with 0 EF
zero_ef = []
for sub in subcategories:
    ef_count = db['emission_factors'].count_documents({'subcategory': sub['code']})
    if ef_count == 0:
        zero_ef.append(sub)
print(f'Sous-categories avec 0 EF: {len(zero_ef)}')
for z in zero_ef:
    print(f'  - {z["name_fr"]} ({z["code"]}) -> {z.get("categories", [])}')

# Duplicate names
print(f'\n=== DOUBLONS NOM FR ===')
seen = {}
dups = 0
for sub in subcategories:
    key = sub['name_fr'].lower().strip()
    if key in seen:
        print(f'  "{sub["name_fr"]}" : {sub["code"]} vs {seen[key]["code"]}')
        dups += 1
    seen[key] = sub
if dups == 0:
    print('  Aucun doublon')

# English names
print(f'\n=== NOMS EN ANGLAIS RESTANTS ===')
en_count = 0
for sub in subcategories:
    name = sub['name_fr']
    if any(w in name.lower() for w in [' and ', ' of ', ' from ', ' waste', 'materials', 'components', 'treatment', 'deposit', 'impoundment', 'recycling', 'elements']):
        print(f'  {sub["name_fr"]} ({sub["code"]})')
        en_count += 1
if en_count == 0:
    print('  Aucun')

# Suspicious mappings
print(f'\n=== MAPPINGS SUSPECTS ===')
suspicious_checks = [
    ('route', 'emissions_procedes'),
    ('route', 'electricite'),
    ('route_transport_individuel', 'emissions_procedes'),
    ('route_transport_individuel', 'electricite'),
    ('route_transports_en_communs', 'emissions_procedes'),
    ('route_transports_en_communs', 'electricite'),
]
found = 0
for sub_code, cat_code in suspicious_checks:
    sub = db['subcategories'].find_one({'code': sub_code}, {'_id': 0})
    if sub and cat_code in sub.get('categories', []):
        print(f'  {sub["name_fr"]} ({sub_code}) -> {cat_code}')
        found += 1
if found == 0:
    print('  Aucun')

# Categories without subcategories
print(f'\n=== CATEGORIES SANS SOUS-CATEGORIES ===')
cat_to_subs = {}
for sub in subcategories:
    for cat_code in sub.get('categories', []):
        cat_to_subs.setdefault(cat_code, []).append(sub)
empty_cats = [c for c in categories if c['code'] not in cat_to_subs]
for c in empty_cats:
    note = ' (normal: saisie auto)' if c['code'] == 'activites_combustibles_energie' else ''
    print(f'  {c["name_fr"]} ({c["code"]}) - scope: {c["scope"]}{note}')
if not empty_cats:
    print('  Aucune')

# Full mapping display
print(f'\n\n{"="*60}')
print(f'  VUE D\'ENSEMBLE : CATEGORIES / SOUS-CATEGORIES')
print(f'{"="*60}')

scopes_order = ['scope1', 'scope2', 'scope3_amont', 'scope3_aval']
scope_labels = {
    'scope1': 'SCOPE 1 - Emissions directes',
    'scope2': 'SCOPE 2 - Emissions indirectes (energie)',
    'scope3_amont': 'SCOPE 3 AMONT - Chaine de valeur amont',
    'scope3_aval': 'SCOPE 3 AVAL - Chaine de valeur aval'
}

total_ef = 0
for scope in scopes_order:
    scope_cats = [c for c in categories if c['scope'] == scope]
    print(f'\n{"─"*60}')
    print(f'  {scope_labels.get(scope, scope)}')
    print(f'{"─"*60}')
    for cat in sorted(scope_cats, key=lambda x: x['code']):
        subs = cat_to_subs.get(cat['code'], [])
        cat_ef = 0
        print(f'\n  {cat["name_fr"]} ({cat["code"]})')
        if not subs:
            note = ' [saisie auto]' if cat['code'] == 'activites_combustibles_energie' else ''
            print(f'    (aucune sous-categorie){note}')
        for sub in sorted(subs, key=lambda x: x.get('order', 0)):
            ef_count = db['emission_factors'].count_documents({'subcategory': sub['code']})
            cat_ef += ef_count
            total_ef += ef_count
            print(f'    - {sub["name_fr"]} ({sub["code"]}) : {ef_count} EF')
        if subs:
            print(f'    [{cat_ef} EF total]')

print(f'\n{"="*60}')
print(f'  TOTAL: {len(subcategories)} sous-categories, {db["emission_factors"].count_documents({})} EF')
print(f'{"="*60}')
