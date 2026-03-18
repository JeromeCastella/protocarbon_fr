"""
Test Admin Unit Conversions CRUD
Tests for GET/POST/PUT/DELETE /api/admin/unit-conversions endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"

# Store created IDs for cleanup
created_conversion_ids = []


class TestSetup:
    """Setup class - get auth token"""
    
    @pytest.fixture(autouse=True, scope="class")
    def auth_headers(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")
        assert token, "No token in response"
        TestSetup.auth_headers_value = {"Authorization": f"Bearer {token}"}
        return TestSetup.auth_headers_value


class TestUnitConversionsGET(TestSetup):
    """GET /api/admin/unit-conversions tests"""
    
    def test_01_get_unit_conversions_returns_list(self, auth_headers):
        """Test GET returns a list of conversions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200, f"GET failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} unit conversions")
    
    def test_02_conversions_count_around_11(self, auth_headers):
        """Test we have approximately 11 conversions as expected"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200
        data = response.json()
        # We expect 11 conversions per the spec
        assert len(data) >= 10, f"Expected at least 10 conversions, got {len(data)}"
        print(f"Conversion count: {len(data)}")
    
    def test_03_conversion_has_required_fields(self, auth_headers):
        """Test each conversion has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "from_unit", "to_unit", "factor"]
        for conv in data[:5]:  # Check first 5
            for field in required_fields:
                assert field in conv, f"Missing field: {field}"
        print("All required fields present")
    
    def test_04_conversions_have_valid_factor(self, auth_headers):
        """Test each conversion has a valid numeric factor"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200
        data = response.json()
        
        for conv in data:
            assert isinstance(conv.get("factor"), (int, float)), f"Invalid factor for {conv.get('from_unit')} -> {conv.get('to_unit')}"
            assert conv["factor"] > 0, f"Factor must be positive"
        print("All factors are valid positive numbers")
    
    def test_05_sample_conversion_data(self, auth_headers):
        """Test and display sample conversion data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200
        data = response.json()
        
        if data:
            sample = data[0]
            print(f"Sample conversion: 1 {sample['from_unit']} = {sample['factor']} {sample['to_unit']}")
            if 'description_fr' in sample:
                print(f"Description FR: {sample.get('description_fr', 'N/A')}")


class TestUnitConversionsPOST(TestSetup):
    """POST /api/admin/unit-conversions tests"""
    
    def test_01_create_conversion_success(self, auth_headers):
        """Test creating a new unit conversion"""
        payload = {
            "from_unit": "TEST_gal",
            "to_unit": "TEST_L",
            "factor": 3.785,
            "description_fr": "Gallons vers Litres (TEST)",
            "description_de": "Gallonen zu Liter (TEST)"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value,
            json=payload
        )
        assert response.status_code == 200, f"POST failed: {response.text}"
        data = response.json()
        
        # Verify response fields
        assert data.get("id"), "No ID in response"
        assert data["from_unit"] == payload["from_unit"]
        assert data["to_unit"] == payload["to_unit"]
        assert data["factor"] == payload["factor"]
        
        # Store for cleanup
        created_conversion_ids.append(data["id"])
        print(f"Created conversion: {data['id']}")
    
    def test_02_create_conversion_minimal_fields(self, auth_headers):
        """Test creating conversion with minimal required fields"""
        payload = {
            "from_unit": "TEST_lb",
            "to_unit": "TEST_kg",
            "factor": 0.453592
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value,
            json=payload
        )
        assert response.status_code == 200, f"POST failed: {response.text}"
        data = response.json()
        assert data.get("id")
        
        # Store for cleanup
        created_conversion_ids.append(data["id"])
        print(f"Created conversion with minimal fields: {data['id']}")
    
    def test_03_verify_created_conversion_persisted(self, auth_headers):
        """Verify created conversion appears in GET"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check TEST conversions exist
        test_conversions = [c for c in data if c.get("from_unit", "").startswith("TEST_")]
        assert len(test_conversions) >= 2, "Created conversions should be persisted"
        print(f"Found {len(test_conversions)} TEST_ conversions")


class TestUnitConversionsPUT(TestSetup):
    """PUT /api/admin/unit-conversions tests"""
    
    def test_01_update_conversion_factor(self, auth_headers):
        """Test updating a conversion's factor"""
        # First create a conversion to update
        create_payload = {
            "from_unit": "TEST_update",
            "to_unit": "TEST_target",
            "factor": 1.0
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value,
            json=create_payload
        )
        assert create_response.status_code == 200
        conv_id = create_response.json()["id"]
        created_conversion_ids.append(conv_id)
        
        # Update the factor
        update_payload = {"factor": 2.5}
        response = requests.put(
            f"{BASE_URL}/api/admin/unit-conversions/{conv_id}",
            headers=TestSetup.auth_headers_value,
            json=update_payload
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        data = response.json()
        assert data["factor"] == 2.5, "Factor not updated"
        print(f"Updated factor to 2.5")
    
    def test_02_update_conversion_descriptions(self, auth_headers):
        """Test updating descriptions"""
        if not created_conversion_ids:
            pytest.skip("No conversions to update")
        
        conv_id = created_conversion_ids[-1]
        update_payload = {
            "description_fr": "Description FR mise à jour (TEST)",
            "description_de": "Beschreibung DE aktualisiert (TEST)"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/unit-conversions/{conv_id}",
            headers=TestSetup.auth_headers_value,
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("description_fr") == update_payload["description_fr"]
        print("Descriptions updated successfully")
    
    def test_03_update_nonexistent_conversion_returns_404(self, auth_headers):
        """Test 404 for non-existent conversion"""
        fake_id = "000000000000000000000000"
        response = requests.put(
            f"{BASE_URL}/api/admin/unit-conversions/{fake_id}",
            headers=TestSetup.auth_headers_value,
            json={"factor": 1.0}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent conversion")


class TestUnitConversionsDELETE(TestSetup):
    """DELETE /api/admin/unit-conversions tests"""
    
    def test_01_delete_conversion_success(self, auth_headers):
        """Test deleting a conversion"""
        # Create a conversion to delete
        create_payload = {
            "from_unit": "TEST_delete",
            "to_unit": "TEST_deleteme",
            "factor": 1.0
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value,
            json=create_payload
        )
        assert create_response.status_code == 200
        conv_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/unit-conversions/{conv_id}",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 200, f"DELETE failed: {response.text}"
        
        # Verify it's gone (GET should not find it)
        get_response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        all_ids = [c["id"] for c in get_response.json()]
        assert conv_id not in all_ids, "Deleted conversion still exists"
        print(f"Deleted conversion: {conv_id}")
    
    def test_02_delete_nonexistent_conversion_returns_404(self, auth_headers):
        """Test 404 for non-existent conversion"""
        fake_id = "000000000000000000000000"
        response = requests.delete(
            f"{BASE_URL}/api/admin/unit-conversions/{fake_id}",
            headers=TestSetup.auth_headers_value
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent conversion")


class TestUnitConversionsAccessControl(TestSetup):
    """Access control tests"""
    
    def test_01_unauthenticated_request_fails(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/admin/unit-conversions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthenticated request correctly rejected")


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_created_conversions(self, auth_headers):
        """Delete all TEST_ prefixed conversions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unit-conversions",
            headers=TestSetup.auth_headers_value
        )
        if response.status_code == 200:
            data = response.json()
            test_conversions = [c for c in data if c.get("from_unit", "").startswith("TEST_") or c.get("to_unit", "").startswith("TEST_")]
            
            deleted = 0
            for conv in test_conversions:
                del_response = requests.delete(
                    f"{BASE_URL}/api/admin/unit-conversions/{conv['id']}",
                    headers=TestSetup.auth_headers_value
                )
                if del_response.status_code == 200:
                    deleted += 1
            
            print(f"Cleaned up {deleted} TEST_ conversions")
        
        # Also clean up from stored IDs
        for conv_id in created_conversion_ids:
            requests.delete(
                f"{BASE_URL}/api/admin/unit-conversions/{conv_id}",
                headers=TestSetup.auth_headers_value
            )
