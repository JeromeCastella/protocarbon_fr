"""
Migration script: Add source_product_name from bafu_product_name
and sync corrections from updated JSON file.

Preserves curation-specific fields: name_simple_fr, name_simple_de, curation_status
"""
import json
import sys
sys.path.append('/app/backend')
from config import emission_factors_collection

FILE_PATH = '/tmp/ef_bafu_ref_v2.json'

# Fields to update from the file (source data + user corrections)
SYNC_FIELDS = [
    'name_fr', 'name_de', 'description_fr', 'description_de',
    'usage_hint_fr', 'usage_hint_de', 'impacts', 'default_unit',
    'input_units', 'subcategory', 'is_public', 'popularity_score',
    'tags', 'search_tags', 'region', 'year', 'source',
    'unit_conversions', 'valid_from_year',
]

def run_migration():
    with open(FILE_PATH) as f:
        data = json.load(f)

    factors = data.get('emission_factors', [])
    print(f"Loaded {len(factors)} factors from file")

    updated = 0
    not_found = 0
    spn_set = 0

    for i, factor in enumerate(factors):
        fid = factor.get('id')
        if not fid:
            continue

        # Build update: source_product_name + synced fields
        update = {}

        bpn = factor.get('bafu_product_name')
        if bpn:
            update['source_product_name'] = bpn
            spn_set += 1
        
        for field in SYNC_FIELDS:
            if field in factor:
                update[field] = factor[field]

        if not update:
            continue

        result = emission_factors_collection.update_one(
            {'id': fid, 'deleted_at': None},
            {'$set': update}
        )

        if result.matched_count > 0:
            updated += 1
        else:
            not_found += 1

        if (i + 1) % 1000 == 0:
            print(f"  Processed {i+1}/{len(factors)}...")

    print(f"\nMigration complete:")
    print(f"  Updated: {updated}")
    print(f"  Not found in DB: {not_found}")
    print(f"  source_product_name set: {spn_set}")

    # Verify
    has_spn = emission_factors_collection.count_documents({'source_product_name': {'$exists': True, '$ne': None}})
    print(f"  Verification — docs with source_product_name: {has_spn}")

if __name__ == '__main__':
    run_migration()
