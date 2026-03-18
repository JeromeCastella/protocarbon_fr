#!/usr/bin/env python3
"""
Extract 50 representative emission factors for AI enrichment POC
"""
import json
import random
import requests
import os

API_URL = os.environ.get('API_URL', 'https://compact-factors.preview.emergentagent.com')

def main():
    # Login
    login_resp = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": "newtest@x.com", "password": "test123"}
    )
    token = login_resp.json().get('token')
    
    if not token:
        print("Failed to login")
        return
    
    # Get all factors
    headers = {"Authorization": f"Bearer {token}"}
    factors_resp = requests.get(f"{API_URL}/api/emission-factors", headers=headers)
    data = factors_resp.json()
    
    print(f"Total factors in database: {len(data)}")
    
    # Target subcategories with quotas (50 total)
    target_quotas = {
        # Transport (15)
        'route': 4,
        'route_transport_individuel': 4,
        'route_transports_en_communs': 3,
        'ferroviaire': 2,
        'aerien': 2,
        
        # Énergie (10)
        'electricite': 5,
        'combustibles': 5,
        
        # Construction/Matériaux (15)
        'beton': 3,
        'bois_et_produits_en_bois': 3,
        'building_elements_and_structures': 3,
        'produits_en_metal': 2,
        'building_and_construction_materials': 2,
        'revetements_de_sol': 2,
        
        # Déchets (5)
        'construction_waste': 2,
        'electronics_waste': 2,
        'wastewater_treatment': 1,
        
        # Services et autres (5)
        'services': 3,
        'carburants': 2,
    }
    
    selected = []
    for subcat, quota in target_quotas.items():
        factors_in_subcat = [f for f in data if f.get('subcategory') == subcat]
        if factors_in_subcat:
            sample = random.sample(factors_in_subcat, min(quota, len(factors_in_subcat)))
            selected.extend(sample)
            print(f"  {subcat}: {len(sample)} selected (target: {quota})")
    
    print(f"\nTotal selected: {len(selected)}")
    
    # Clean up for export (remove unnecessary fields)
    export_factors = []
    for f in selected:
        export_factors.append({
            "id": f.get("id"),
            "name_fr": f.get("name_fr"),
            "name_de": f.get("name_de"),
            "subcategory": f.get("subcategory"),
            "input_units": f.get("input_units", []),
            "default_unit": f.get("default_unit"),
            "impacts": f.get("impacts", []),
            "tags": f.get("tags", []),
            "source": f.get("source"),
            "region": f.get("region"),
        })
    
    # Save to file
    output_path = "/app/scripts/factors_sample_50.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export_factors, f, indent=2, ensure_ascii=False)
    
    print(f"\nExported to: {output_path}")
    
    # Print summary
    print("\n--- Sample Preview ---")
    for factor in export_factors[:5]:
        print(f"\n• {factor['name_fr']}")
        print(f"  Subcategory: {factor['subcategory']}")
        print(f"  Units: {factor['input_units']}")
        impact = factor['impacts'][0] if factor['impacts'] else {}
        print(f"  Impact: {impact.get('value', 'N/A')} {impact.get('unit', '')}")

if __name__ == "__main__":
    main()
