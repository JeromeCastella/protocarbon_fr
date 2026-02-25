#!/usr/bin/env python3
"""
Import enriched factors into MongoDB
Updates existing factors with the new enriched fields
"""
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'carbon_tracker')

def main():
    # Load enriched factors
    with open('/app/scripts/factors_sample_50_enriched.json', 'r', encoding='utf-8') as f:
        enriched_factors = json.load(f)
    
    # Filter only enriched ones
    enriched_factors = [f for f in enriched_factors if f.get('name_simple_fr')]
    print(f"Loaded {len(enriched_factors)} enriched factors")
    
    # Connect to MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db['emission_factors']
    
    # Update each factor
    updated_count = 0
    not_found_count = 0
    
    for factor in enriched_factors:
        factor_id = factor.get('id')
        
        # Fields to update
        update_fields = {
            'name_simple_fr': factor.get('name_simple_fr'),
            'name_simple_de': factor.get('name_simple_de'),
            'description_fr': factor.get('description_fr'),
            'description_de': factor.get('description_de'),
            'search_tags': factor.get('search_tags', []),
            'usage_hint_fr': factor.get('usage_hint_fr'),
            'usage_hint_de': factor.get('usage_hint_de'),
            'popularity_score': factor.get('popularity_score', 50),
        }
        
        # Update by ID
        from bson import ObjectId
        try:
            result = collection.update_one(
                {'_id': ObjectId(factor_id)},
                {'$set': update_fields}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"  ✅ Updated: {factor.get('name_simple_fr')}")
            else:
                not_found_count += 1
                print(f"  ⚠️ Not found or unchanged: {factor_id}")
                
        except Exception as e:
            print(f"  ❌ Error updating {factor_id}: {e}")
            not_found_count += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Import complete!")
    print(f"   Updated: {updated_count}")
    print(f"   Not found/unchanged: {not_found_count}")
    
    # Verify by checking one enriched factor
    print("\n--- Verification ---")
    sample = collection.find_one({'name_simple_fr': {'$exists': True, '$ne': None}})
    if sample:
        print(f"Sample enriched factor in DB:")
        print(f"  name_fr: {sample.get('name_fr')}")
        print(f"  name_simple_fr: {sample.get('name_simple_fr')}")
        print(f"  description_fr: {sample.get('description_fr')}")
        print(f"  search_tags: {sample.get('search_tags')}")
        print(f"  popularity_score: {sample.get('popularity_score')}")
    else:
        print("No enriched factor found in DB!")

if __name__ == "__main__":
    main()
