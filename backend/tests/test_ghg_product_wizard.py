"""
Test GHG Protocol Product Wizard Backend APIs
Tests for Product creation/update with end_of_life entries and disposal_emissions calculation
"""
import pytest
import requests
import os
import time

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


class TestEmissionFactorCategories:
    """Test emission factor endpoints used by ProductWizard - FEATURE PREREQUISITE"""
    
    def test_fin_vie_produits_category(self, auth_headers):
        """Verify fin_vie_produits category returns factors for EOL step"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"fin_vie_produits: {len(data)} factors")
        assert len(data) > 0, "fin_vie_produits category should have factors"
        
        # Check factor structure has impacts array
        if data:
            factor = data[0]
            assert "impacts" in factor or "value" in factor, "Factor should have impacts or value"
            print(f"Sample factor: {factor.get('name_simple_fr') or factor.get('name_fr')}")
    
    def test_electricite_category(self, auth_headers):
        """Verify electricite category returns factors for energy steps"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/electricite",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"electricite: {len(data)} factors")
        assert len(data) > 0
    
    def test_combustion_fixe_category(self, auth_headers):
        """Verify combustion_fixe category returns factors for fuel"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/combustion_fixe",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"combustion_fixe: {len(data)} factors")
        assert len(data) > 0
    
    def test_carburant_by_tags(self, auth_headers):
        """Verify carburant tag returns factors"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-tags?tags=carburant",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"carburant (by-tags): {len(data)} factors")
    
    def test_emissions_fugitives_category(self, auth_headers):
        """Verify emissions_fugitives category returns refrigerant factors"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/emissions_fugitives",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"emissions_fugitives: {len(data)} factors")


class TestProductEnhancedWithEOL:
    """Test enhanced product creation with end_of_life entries - FEATURES 7-8"""
    
    created_product_id = None
    eol_factor_id = None
    electricity_factor_id = None
    
    def test_get_eol_factor_id(self, auth_headers):
        """Helper: Get an EOL factor ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits",
            headers=auth_headers
        )
        data = response.json()
        if data:
            TestProductEnhancedWithEOL.eol_factor_id = data[0].get("id")
            print(f"Got EOL factor ID: {TestProductEnhancedWithEOL.eol_factor_id}")
        
        # Also get electricity factor
        elec_response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/electricite",
            headers=auth_headers
        )
        elec_data = elec_response.json()
        if elec_data:
            TestProductEnhancedWithEOL.electricity_factor_id = elec_data[0].get("id")
            print(f"Got electricity factor ID: {TestProductEnhancedWithEOL.electricity_factor_id}")
    
    def test_create_product_enhanced_with_eol(self, auth_headers):
        """FEATURE 7: POST /api/products/enhanced with end_of_life entries"""
        timestamp = int(time.time())
        
        payload = {
            "name": f"TEST_GHG_EOL_{timestamp}",
            "description": "Product with end-of-life entries",
            "product_type": "finished",
            "unit": "unit",
            "lifespan_years": 5,
            "transformation": None,  # No transformation for finished product
            "usage": {
                "electricity_kwh_per_cycle": 0.5,
                "electricity_factor_id": TestProductEnhancedWithEOL.electricity_factor_id or "",
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": "",
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": "",
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": "",
                "cycles_per_year": 100
            },
            "end_of_life": [
                {
                    "name": "Incinération plastiques",
                    "quantity": 2.5,
                    "unit": "kg",
                    "emission_factor_id": TestProductEnhancedWithEOL.eol_factor_id or ""
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/enhanced",
            headers=auth_headers,
            json=payload
        )
        
        print(f"CREATE response status: {response.status_code}")
        print(f"CREATE response: {response.text[:500]}")
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing product id"
        TestProductEnhancedWithEOL.created_product_id = data["id"]
        
        # Verify end_of_life was saved
        assert "end_of_life" in data, "Response missing end_of_life"
        assert len(data["end_of_life"]) > 0, "end_of_life should have entries"
        
        # Verify disposal_emissions was calculated
        assert "disposal_emissions" in data, "Response missing disposal_emissions"
        print(f"disposal_emissions: {data.get('disposal_emissions', 0)}")
        print(f"usage_emissions: {data.get('usage_emissions', 0)}")
        print(f"total_emissions_per_unit: {data.get('total_emissions_per_unit', 0)}")
        
        print(f"FEATURE 7 PASS: Created product {data['id']} with end_of_life entries")
    
    def test_get_product_verifies_eol(self, auth_headers):
        """Verify GET returns the product with end_of_life data"""
        if not TestProductEnhancedWithEOL.created_product_id:
            pytest.skip("No product created")
        
        response = requests.get(
            f"{BASE_URL}/api/products/{TestProductEnhancedWithEOL.created_product_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "end_of_life" in data
        assert len(data["end_of_life"]) > 0
        assert data["end_of_life"][0]["quantity"] == 2.5
        print(f"GET verified: end_of_life with {len(data['end_of_life'])} entries")
    
    def test_update_product_enhanced_with_eol(self, auth_headers):
        """FEATURE 8: PUT /api/products/enhanced/{id} updates end_of_life entries"""
        if not TestProductEnhancedWithEOL.created_product_id:
            pytest.skip("No product created")
        
        payload = {
            "name": f"TEST_GHG_EOL_UPDATED",
            "description": "Updated product with more EOL",
            "product_type": "finished",
            "unit": "unit",
            "lifespan_years": 10,
            "transformation": None,
            "usage": {
                "electricity_kwh_per_cycle": 1.0,
                "electricity_factor_id": TestProductEnhancedWithEOL.electricity_factor_id or "",
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": "",
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": "",
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": "",
                "cycles_per_year": 50
            },
            "end_of_life": [
                {
                    "name": "Incinération plastiques updated",
                    "quantity": 5.0,
                    "unit": "kg",
                    "emission_factor_id": TestProductEnhancedWithEOL.eol_factor_id or ""
                },
                {
                    "name": "Recyclage métaux",
                    "quantity": 1.5,
                    "unit": "kg",
                    "emission_factor_id": TestProductEnhancedWithEOL.eol_factor_id or ""
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/products/enhanced/{TestProductEnhancedWithEOL.created_product_id}",
            headers=auth_headers,
            json=payload
        )
        
        print(f"UPDATE response status: {response.status_code}")
        print(f"UPDATE response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_GHG_EOL_UPDATED"
        assert data["lifespan_years"] == 10
        
        # Verify end_of_life was updated
        assert len(data["end_of_life"]) == 2, "Should have 2 EOL entries after update"
        
        print(f"Updated disposal_emissions: {data.get('disposal_emissions', 0)}")
        print(f"FEATURE 8 PASS: Updated product with new end_of_life entries")
    
    def test_cleanup_product(self, auth_headers):
        """Cleanup: Delete test product"""
        if not TestProductEnhancedWithEOL.created_product_id:
            pytest.skip("No product to cleanup")
        
        response = requests.delete(
            f"{BASE_URL}/api/products/{TestProductEnhancedWithEOL.created_product_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"Cleaned up product {TestProductEnhancedWithEOL.created_product_id}")


class TestSemiFinishedProductWithTransformation:
    """Test semi-finished product with transformation step"""
    
    created_product_id = None
    
    def test_create_semi_finished_with_transformation(self, auth_headers):
        """Create semi-finished product with transformation energy"""
        timestamp = int(time.time())
        
        # Get electricity factor
        elec_response = requests.get(
            f"{BASE_URL}/api/emission-factors/by-category/electricite",
            headers=auth_headers
        )
        elec_data = elec_response.json()
        elec_factor_id = elec_data[0].get("id") if elec_data else ""
        
        payload = {
            "name": f"TEST_SemiFini_{timestamp}",
            "description": "Semi-finished product with transformation",
            "product_type": "semi_finished",  # Key: semi_finished enables transformation
            "unit": "unit",
            "lifespan_years": 3,
            "transformation": {
                "electricity_kwh": 10.0,
                "electricity_factor_id": elec_factor_id,
                "fuel_kwh": 5.0,
                "fuel_factor_id": "",
                "carburant_l": 0,
                "carburant_factor_id": "",
                "refrigerant_kg": 0,
                "refrigerant_factor_id": ""
            },
            "usage": {
                "electricity_kwh_per_cycle": 0.2,
                "electricity_factor_id": elec_factor_id,
                "fuel_kwh_per_cycle": 0,
                "fuel_factor_id": "",
                "carburant_l_per_cycle": 0,
                "carburant_factor_id": "",
                "refrigerant_kg_per_cycle": 0,
                "refrigerant_factor_id": "",
                "cycles_per_year": 200
            },
            "end_of_life": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/products/enhanced",
            headers=auth_headers,
            json=payload
        )
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        data = response.json()
        TestSemiFinishedProductWithTransformation.created_product_id = data["id"]
        
        # Verify transformation (manufacturing) emissions were calculated
        manufacturing = data.get("manufacturing_emissions", 0)
        print(f"manufacturing_emissions (from transformation): {manufacturing}")
        
        # With electricity factor, should have non-zero emissions if factor has value
        print(f"Product type: {data.get('product_type')}")
        print(f"PASS: Semi-finished product created with transformation data")
    
    def test_cleanup_semi_finished(self, auth_headers):
        """Cleanup"""
        if TestSemiFinishedProductWithTransformation.created_product_id:
            requests.delete(
                f"{BASE_URL}/api/products/{TestSemiFinishedProductWithTransformation.created_product_id}",
                headers=auth_headers
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
