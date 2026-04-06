"""
Test suite for Admin Emission Factors V2 - New Fields
Tests the new fields added to the edit form:
- name_simple_fr, name_simple_de (simplified names)
- source_product_name (BAFU ecoinvent name)
- reporting_method (location/market/empty)
- popularity_score (0-100 slider)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminFactorsNewFields:
    """Test PUT /api/admin/emission-factors-v2/{id} with new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token, get first factor for testing"""
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "newtest@x.com", "password": "test123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get first factor for testing
        factors_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page_size=1",
            headers=self.headers
        )
        assert factors_response.status_code == 200, f"Failed to get factors: {factors_response.text}"
        data = factors_response.json()
        # API returns "items" not "factors"
        items = data.get("items") or data.get("factors") or []
        assert len(items) > 0, f"No factors found in response: {data}"
        self.test_factor = items[0]
        self.factor_id = self.test_factor["id"]
    
    def test_put_accepts_name_simple_fr(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts name_simple_fr field"""
        test_value = "TEST_Nom simplifié FR"
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"name_simple_fr": test_value}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("name_simple_fr") == test_value, f"name_simple_fr not updated: {data}"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors-v2?page_size=100",
            headers=self.headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        factors = data.get("items") or data.get("factors") or []
        updated_factor = next((f for f in factors if f["id"] == self.factor_id), None)
        assert updated_factor is not None, "Factor not found after update"
        assert updated_factor.get("name_simple_fr") == test_value, "name_simple_fr not persisted"
    
    def test_put_accepts_name_simple_de(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts name_simple_de field"""
        test_value = "TEST_Vereinfachter Name DE"
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"name_simple_de": test_value}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("name_simple_de") == test_value, f"name_simple_de not updated: {data}"
    
    def test_put_accepts_source_product_name(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts source_product_name field"""
        test_value = "TEST_Light fuel oil, burned in boiler 100kW {CH} MJ"
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"source_product_name": test_value}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("source_product_name") == test_value, f"source_product_name not updated: {data}"
    
    def test_put_accepts_reporting_method_location(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts reporting_method='location'"""
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"reporting_method": "location"}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("reporting_method") == "location", f"reporting_method not updated: {data}"
    
    def test_put_accepts_reporting_method_market(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts reporting_method='market'"""
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"reporting_method": "market"}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("reporting_method") == "market", f"reporting_method not updated: {data}"
    
    def test_put_accepts_reporting_method_null(self):
        """PUT /api/admin/emission-factors-v2/{id} with reporting_method=null is filtered out"""
        # First set a value
        requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"reporting_method": "location"}
        )
        
        # Sending null alone results in "No data to update" (expected behavior)
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"reporting_method": None}
        )
        # Backend filters out null values, so if only null is sent, it returns 400
        assert response.status_code == 400, f"Expected 400 for null-only update, got {response.status_code}"
        
        # To clear reporting_method, send empty string
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"reporting_method": ""}
        )
        assert response.status_code == 200, f"PUT with empty string failed: {response.text}"
        data = response.json()
        assert data.get("reporting_method") == "", f"reporting_method not cleared: {data}"
    
    def test_put_accepts_popularity_score(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts popularity_score field"""
        test_value = 75
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"popularity_score": test_value}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("popularity_score") == test_value, f"popularity_score not updated: {data}"
    
    def test_put_accepts_popularity_score_min(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts popularity_score=0"""
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"popularity_score": 0}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("popularity_score") == 0, f"popularity_score not updated: {data}"
    
    def test_put_accepts_popularity_score_max(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts popularity_score=100"""
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={"popularity_score": 100}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data.get("popularity_score") == 100, f"popularity_score not updated: {data}"
    
    def test_put_multiple_new_fields_together(self):
        """PUT /api/admin/emission-factors-v2/{id} accepts all new fields together"""
        update_data = {
            "name_simple_fr": "TEST_Multi Nom FR",
            "name_simple_de": "TEST_Multi Name DE",
            "source_product_name": "TEST_Multi source product",
            "reporting_method": "location",
            "popularity_score": 85
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        
        assert data.get("name_simple_fr") == update_data["name_simple_fr"]
        assert data.get("name_simple_de") == update_data["name_simple_de"]
        assert data.get("source_product_name") == update_data["source_product_name"]
        assert data.get("reporting_method") == update_data["reporting_method"]
        assert data.get("popularity_score") == update_data["popularity_score"]
    
    def test_put_requires_authentication(self):
        """PUT /api/admin/emission-factors-v2/{id} requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            json={"name_simple_fr": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_cleanup_test_data(self):
        """Cleanup: Reset test factor to original values"""
        # Reset to neutral values
        response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors-v2/{self.factor_id}",
            headers=self.headers,
            json={
                "name_simple_fr": self.test_factor.get("name_simple_fr"),
                "name_simple_de": self.test_factor.get("name_simple_de"),
                "source_product_name": self.test_factor.get("source_product_name"),
                "reporting_method": self.test_factor.get("reporting_method"),
                "popularity_score": self.test_factor.get("popularity_score", 50)
            }
        )
        assert response.status_code == 200, f"Cleanup failed: {response.text}"
