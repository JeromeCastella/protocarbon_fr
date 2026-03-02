"""
Test ProductWizard Backend APIs
Tests for Product creation, update, emission factor endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "newtest@x.com", "password": "test123"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture
def auth_headers(auth_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestProductEnhancedEndpoints:
    """Test enhanced product CRUD operations"""
    
    created_product_id = None
    
    def test_create_product_enhanced(self, auth_headers):
        """POST /api/products/enhanced - Create enhanced product"""
        payload = {
            "name": "TEST_Product_Enhanced",
            "description": "Test description",
            "product_type": "finished",
            "unit": "unit",
            "lifespan_years": 5,
            "materials": [],
            "transformation": None,
            "usage": {
                "electricity_kwh_per_cycle": 0.5,
                "electricity_factor_id": "",
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": "",
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": "",
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": "",
                "cycles_per_year": 100
            }
        }
        response = requests.post(f"{BASE_URL}/api/products/enhanced", headers=auth_headers, json=payload)
        assert response.status_code in [200, 201], f"Failed to create product: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing product id"
        assert data["name"] == "TEST_Product_Enhanced"
        TestProductEnhancedEndpoints.created_product_id = data["id"]
        print(f"Created product ID: {data['id']}")
    
    def test_get_product_enhanced(self, auth_headers):
        """GET /api/products/{id} - Get created product"""
        if not TestProductEnhancedEndpoints.created_product_id:
            pytest.skip("No product created")
        
        response = requests.get(
            f"{BASE_URL}/api/products/{TestProductEnhancedEndpoints.created_product_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Product_Enhanced"
    
    def test_update_product_enhanced(self, auth_headers):
        """PUT /api/products/enhanced/{id} - Update enhanced product (BUG FIX VERIFICATION)"""
        if not TestProductEnhancedEndpoints.created_product_id:
            pytest.skip("No product created")
        
        payload = {
            "name": "TEST_Product_Enhanced_Updated",
            "description": "Updated description",
            "product_type": "semi_finished",
            "unit": "kg",
            "lifespan_years": 10,
            "materials": [],
            "transformation": {
                "electricity_kwh": 5,
                "electricity_factor_id": "",
                "fuel_kwh": 0,
                "fuel_factor_id": "",
                "region": "France"
            },
            "usage": {
                "electricity_kwh_per_cycle": 1.5,
                "electricity_factor_id": "",
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": "",
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": "",
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": "",
                "cycles_per_year": 200
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/products/enhanced/{TestProductEnhancedEndpoints.created_product_id}",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"PUT /enhanced/{{}}/{{id}} failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Product_Enhanced_Updated"
        assert data["product_type"] == "semi_finished"
        assert data["lifespan_years"] == 10
        print("PUT /api/products/enhanced/{id} working correctly")
    
    def test_delete_product_enhanced(self, auth_headers):
        """DELETE /api/products/{id} - Cleanup test product"""
        if not TestProductEnhancedEndpoints.created_product_id:
            pytest.skip("No product created")
        
        response = requests.delete(
            f"{BASE_URL}/api/products/{TestProductEnhancedEndpoints.created_product_id}",
            headers=auth_headers
        )
        assert response.status_code == 200


class TestEmissionFactorEndpoints:
    """Test emission factor endpoints used by ProductWizard"""
    
    def test_by_category_materiaux_bug(self, auth_headers):
        """BUG: /api/emission-factors/by-category/materiaux returns empty - wrong category"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/materiaux", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # This documents the BUG - 'materiaux' is not a valid category in subcategories collection
        print(f"materiaux category returns {len(data)} factors - EXPECTED TO BE EMPTY (BUG)")
        # The fix should use a different category or endpoint
    
    def test_by_category_electricite_works(self, auth_headers):
        """WORKING: /api/emission-factors/by-category/electricite returns factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/electricite", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "electricite category should return factors"
        print(f"electricite category returns {len(data)} factors")
    
    def test_by_category_fin_vie_produits_works(self, auth_headers):
        """WORKING: /api/emission-factors/by-category/fin_vie_produits returns factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "fin_vie_produits category should return factors"
        print(f"fin_vie_produits category returns {len(data)} factors")
    
    def test_by_category_refrigerants_bug(self, auth_headers):
        """BUG: /api/emission-factors/by-category/refrigerants returns empty - wrong category"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/refrigerants", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # This documents the BUG - 'refrigerants' is a subcategory, not a category
        print(f"refrigerants category returns {len(data)} factors - EXPECTED TO BE FEW OR EMPTY")
    
    def test_by_category_emissions_fugitives_works(self, auth_headers):
        """WORKING: /api/emission-factors/by-category/emissions_fugitives returns refrigerant factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-category/emissions_fugitives", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # emissions_fugitives is a proper category that includes refrigerants subcategory
        print(f"emissions_fugitives category returns {len(data)} factors (includes refrigerants)")
        # Check if any have 'refrigerants' subcategory
        refrig_count = len([f for f in data if f.get('subcategory') == 'refrigerants'])
        print(f"  Of which {refrig_count} are refrigerants")
    
    def test_by_tags_combustible(self, auth_headers):
        """Test by-tags endpoint for combustible"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-tags?tags=combustible", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"by-tags combustible returns {len(data)} factors")
    
    def test_by_tags_carburant(self, auth_headers):
        """Test by-tags endpoint for carburant"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/by-tags?tags=carburant", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"by-tags carburant returns {len(data)} factors")
    
    def test_search_by_subcategory_refrigerants(self, auth_headers):
        """WORKAROUND: Use search endpoint with subcategory=refrigerants"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search?subcategory=refrigerants", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "search?subcategory=refrigerants should return factors"
        print(f"search?subcategory=refrigerants returns {len(data)} factors")


class TestProductSalesFlow:
    """Test product sales recording"""
    
    def test_get_products(self, auth_headers):
        """GET /api/products - List products"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data)} products")
        return data
    
    def test_record_sale(self, auth_headers):
        """POST /api/products/{id}/sales - Record a sale"""
        # First get a product
        products = requests.get(f"{BASE_URL}/api/products", headers=auth_headers).json()
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        payload = {
            "product_id": product_id,
            "quantity": 5,
            "date": "2024-01-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/products/{product_id}/sales", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "sale_id" in data
        print(f"Recorded sale with ID: {data['sale_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
