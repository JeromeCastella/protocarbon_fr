"""
Backend API Tests for Product Lifecycle Features
Tests: Product Wizard, Materials, Transformation, Usage, End-of-Life, Product Sales
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://carbon-footprint-14.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


class TestEmissionFactorsForProducts:
    """Test emission factors needed for product lifecycle"""
    
    def test_get_materials_emission_factors(self):
        """Test getting materials emission factors (Acier, Aluminium, etc.)"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/materiaux")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"Expected at least 10 materials, got {len(data)}"
        
        # Verify some expected materials exist
        material_names = [m["name"] for m in data]
        assert any("Acier" in name for name in material_names), "Acier not found in materials"
        assert any("Aluminium" in name for name in material_names), "Aluminium not found in materials"
        print(f"✓ Retrieved {len(data)} material emission factors")
        return data
    
    def test_get_treatment_emission_factors(self):
        """Test getting end-of-life treatment factors (Recyclage, Incinération, etc.)"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5, f"Expected at least 5 treatments, got {len(data)}"
        
        # Verify some expected treatments exist
        treatment_names = [t["name"] for t in data]
        assert any("Recyclage" in name for name in treatment_names), "Recyclage not found in treatments"
        assert any("Incinération" in name for name in treatment_names), "Incinération not found in treatments"
        print(f"✓ Retrieved {len(data)} treatment emission factors")
        return data
    
    def test_get_refrigerant_emission_factors(self):
        """Test getting refrigerant emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/refrigerants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4, f"Expected at least 4 refrigerants, got {len(data)}"
        
        # Verify some expected refrigerants exist
        refrigerant_names = [r["name"] for r in data]
        assert any("R-134a" in name for name in refrigerant_names), "R-134a not found in refrigerants"
        print(f"✓ Retrieved {len(data)} refrigerant emission factors")
        return data
    
    def test_get_electricity_emission_factors(self):
        """Test getting electricity emission factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/electricite")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1, f"Expected at least 1 electricity factor, got {len(data)}"
        print(f"✓ Retrieved {len(data)} electricity emission factors")
        return data
    
    def test_get_factors_by_tags_combustible(self):
        """Test getting combustible factors by tags"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-tags?tags=combustible")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} combustible emission factors")
        return data
    
    def test_get_factors_by_tags_carburant(self):
        """Test getting carburant factors by tags"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-tags?tags=carburant")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} carburant emission factors")
        return data


class TestProductEnhancedCRUD:
    """Test enhanced product CRUD operations"""
    
    def test_create_enhanced_product_finished(self, auth_token):
        """Test creating a finished product with full lifecycle data"""
        # Get material and treatment IDs
        materials_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/materiaux")
        treatments_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits")
        electricity_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/electricite")
        
        materials = materials_res.json()
        treatments = treatments_res.json()
        electricity = electricity_res.json()
        
        # Find specific factors
        acier = next((m for m in materials if "Acier" in m["name"]), materials[0] if materials else None)
        recyclage = next((t for t in treatments if "Recyclage" in t["name"]), treatments[0] if treatments else None)
        elec_france = next((e for e in electricity if "France" in e["name"]), electricity[0] if electricity else None)
        
        product_data = {
            "name": "TEST_Machine à laver EcoWash",
            "description": "Machine à laver économe en énergie",
            "product_type": "finished",
            "unit": "unit",
            "lifespan_years": 10,
            "materials": [
                {
                    "material_name": "Acier",
                    "emission_factor_id": acier["id"] if acier else None,
                    "weight_kg": 30,
                    "treatment_type": "recyclage",
                    "treatment_emission_factor_id": recyclage["id"] if recyclage else None,
                    "recyclability_percent": 90
                }
            ],
            "transformation": None,
            "usage": {
                "electricity_kwh_per_cycle": 0.8,
                "electricity_factor_id": elec_france["id"] if elec_france else None,
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": None,
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": None,
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": None,
                "cycles_per_year": 200
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/enhanced",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=product_data
        )
        assert response.status_code == 200, f"Failed to create product: {response.text}"
        data = response.json()
        
        # Verify product structure
        assert "id" in data
        assert data["name"] == product_data["name"]
        assert data["product_type"] == "finished"
        assert data["is_enhanced"] == True
        assert "transformation_emissions" in data
        assert "usage_emissions" in data
        assert "disposal_emissions" in data
        assert "total_emissions_per_unit" in data
        
        # Verify emissions are calculated
        assert data["usage_emissions"] > 0, "Usage emissions should be > 0"
        assert data["disposal_emissions"] != 0, "Disposal emissions should be calculated"
        
        print(f"✓ Created enhanced finished product: {data['name']}")
        print(f"  - Usage emissions: {data['usage_emissions']} kgCO2e")
        print(f"  - Disposal emissions: {data['disposal_emissions']} kgCO2e")
        print(f"  - Total per unit: {data['total_emissions_per_unit']} kgCO2e")
        
        return data
    
    def test_create_enhanced_product_semi_finished(self, auth_token):
        """Test creating a semi-finished product with transformation energy"""
        # Get emission factors
        materials_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/materiaux")
        treatments_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits")
        electricity_res = requests.get(f"{BASE_URL}/api/emission-factors/by-category/electricite")
        
        materials = materials_res.json()
        treatments = treatments_res.json()
        electricity = electricity_res.json()
        
        aluminium = next((m for m in materials if "Aluminium" in m["name"]), materials[0] if materials else None)
        incineration = next((t for t in treatments if "Incinération" in t["name"]), treatments[0] if treatments else None)
        elec_france = next((e for e in electricity if "France" in e["name"]), electricity[0] if electricity else None)
        
        product_data = {
            "name": "TEST_Composant Aluminium Semi-fini",
            "description": "Composant nécessitant transformation",
            "product_type": "semi_finished",
            "unit": "kg",
            "lifespan_years": 5,
            "materials": [
                {
                    "material_name": "Aluminium",
                    "emission_factor_id": aluminium["id"] if aluminium else None,
                    "weight_kg": 1,
                    "treatment_type": "incineration",
                    "treatment_emission_factor_id": incineration["id"] if incineration else None,
                    "recyclability_percent": 70
                }
            ],
            "transformation": {
                "electricity_kwh": 5,
                "electricity_factor_id": elec_france["id"] if elec_france else None,
                "fuel_kwh": 2,
                "fuel_factor_id": None,
                "region": "France"
            },
            "usage": {
                "electricity_kwh_per_cycle": 0,
                "electricity_factor_id": None,
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": None,
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": None,
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": None,
                "cycles_per_year": 1
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/enhanced",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=product_data
        )
        assert response.status_code == 200, f"Failed to create semi-finished product: {response.text}"
        data = response.json()
        
        # Verify product structure
        assert data["product_type"] == "semi_finished"
        assert data["transformation_emissions"] > 0, "Semi-finished product should have transformation emissions"
        
        print(f"✓ Created enhanced semi-finished product: {data['name']}")
        print(f"  - Transformation emissions: {data['transformation_emissions']} kgCO2e")
        print(f"  - Disposal emissions: {data['disposal_emissions']} kgCO2e")
        print(f"  - Total per unit: {data['total_emissions_per_unit']} kgCO2e")
        
        return data
    
    def test_get_products_list(self, auth_token):
        """Test getting list of products"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check for enhanced products
        enhanced_products = [p for p in data if p.get("is_enhanced")]
        print(f"✓ Retrieved {len(data)} products ({len(enhanced_products)} enhanced)")
        return data
    
    def test_get_single_product(self, auth_token):
        """Test getting a single product by ID"""
        # First get list of products
        products_res = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        products = products_res.json()
        
        if products:
            product_id = products[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/products/{product_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == product_id
            print(f"✓ Retrieved single product: {data['name']}")
        else:
            print("✓ No products to test (skipped)")


class TestProductSales:
    """Test product sales and Scope 3 Aval activity creation"""
    
    def test_record_product_sale_enhanced(self, auth_token):
        """Test recording a sale and verifying Scope 3 Aval activities are created"""
        # First get an enhanced product
        products_res = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        products = products_res.json()
        enhanced_products = [p for p in products if p.get("is_enhanced")]
        
        if not enhanced_products:
            pytest.skip("No enhanced products available for sale test")
        
        product = enhanced_products[0]
        product_id = product["id"]
        
        # Record a sale
        sale_data = {
            "product_id": product_id,
            "quantity": 10,
            "year": 2025
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/{product_id}/sales/enhanced",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=sale_data
        )
        assert response.status_code == 200, f"Failed to record sale: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "sale" in data
        assert "activities_created" in data
        
        # Verify sale data
        sale = data["sale"]
        assert sale["quantity"] == 10
        assert sale["year"] == 2025
        
        # Verify activities were created in Scope 3 Aval categories
        activities = data["activities_created"]
        if activities:
            activity_categories = [a["category_id"] for a in activities]
            print(f"✓ Sale recorded with {len(activities)} activities created")
            print(f"  - Categories: {activity_categories}")
            
            # Check that activities are in expected categories
            expected_categories = ["transformation_produits", "utilisation_produits", "fin_vie_produits"]
            for cat in activity_categories:
                assert cat in expected_categories, f"Unexpected category: {cat}"
        else:
            print("✓ Sale recorded (no activities created - product may have 0 emissions)")
        
        return data
    
    def test_verify_scope3_aval_activities(self, auth_token):
        """Verify that product sales create activities in Scope 3 Aval"""
        response = requests.get(
            f"{BASE_URL}/api/activities?scope=scope3_aval",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for product-related activities
        product_activities = [a for a in data if a.get("product_id")]
        print(f"✓ Found {len(product_activities)} product-related activities in Scope 3 Aval")
        
        # Verify categories
        if product_activities:
            categories = set(a["category_id"] for a in product_activities)
            print(f"  - Categories: {categories}")
        
        return data


class TestProductSaleCategories:
    """Test that Scope 3 Aval product categories are properly configured"""
    
    def test_scope3_aval_categories_exist(self):
        """Verify transformation, utilisation, fin_vie categories exist"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        
        scope3_aval = [c for c in categories if c.get("scope") == "scope3_aval"]
        category_codes = [c["code"] for c in scope3_aval]
        
        # Verify required categories exist
        assert "transformation_produits" in category_codes, "transformation_produits category missing"
        assert "utilisation_produits" in category_codes, "utilisation_produits category missing"
        assert "fin_vie_produits" in category_codes, "fin_vie_produits category missing"
        
        print(f"✓ Scope 3 Aval categories verified: {category_codes}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_products(self, auth_token):
        """Delete test products created during testing"""
        products_res = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        products = products_res.json()
        
        deleted_count = 0
        for product in products:
            if product["name"].startswith("TEST_"):
                delete_res = requests.delete(
                    f"{BASE_URL}/api/products/{product['id']}",
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
                if delete_res.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
