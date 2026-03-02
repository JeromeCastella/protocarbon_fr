"""
Tests for Phase 3 features: O3-A2 (Versioning), O3-A3 (Recalculate), O3-A4 (Preview), O3-A5 (Validation)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuth:
    """Authentication for test session"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Authenticated requests session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session


class TestEmissionFactors(TestAuth):
    """Get valid emission factor IDs for testing"""
    
    @pytest.fixture(scope="class")
    def electricity_factor_id(self, api_client):
        """Get first electricity factor ID (for usage tests)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/by-category/electricite")
        assert response.status_code == 200
        factors = response.json()
        assert len(factors) > 0, "No electricity factors found"
        return factors[0]["id"]
    
    @pytest.fixture(scope="class")
    def eol_factor_id(self, api_client):
        """Get first end-of-life factor ID (fin_vie_produits)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/by-category/fin_vie_produits")
        assert response.status_code == 200
        factors = response.json()
        assert len(factors) > 0, "No end-of-life factors found"
        return factors[0]["id"]


# ============ O3-A4: PREVIEW ENDPOINT TESTS ============

class TestPreviewEndpoint(TestEmissionFactors):
    """Tests for POST /api/products/preview (O3-A4)"""
    
    def test_preview_with_valid_factors_returns_emissions(self, api_client, electricity_factor_id, eol_factor_id):
        """O3-A4: Preview with valid factor IDs calculates emissions without DB creation"""
        payload = {
            "name": "TEST_Preview_Product",
            "product_type": "finished",
            "lifespan_years": 5,
            "usage": {
                "electricity_kwh_per_cycle": 1.5,
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 100
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 2.0,
                    "unit": "kg"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/preview", json=payload)
        
        assert response.status_code == 200, f"Preview failed: {response.text}"
        data = response.json()
        
        # Verify emissions are returned
        assert "manufacturing_emissions" in data
        assert "usage_emissions" in data
        assert "disposal_emissions" in data
        assert "total_emissions_per_unit" in data
        
        # Verify total is sum of components
        expected_total = data["manufacturing_emissions"] + data["usage_emissions"] + data["disposal_emissions"]
        assert abs(data["total_emissions_per_unit"] - expected_total) < 0.001
        
        print(f"Preview emissions: total={data['total_emissions_per_unit']}, usage={data['usage_emissions']}, disposal={data['disposal_emissions']}")
    
    def test_preview_with_invalid_factor_id_returns_422(self, api_client):
        """O3-A4: Preview with invalid factor ID returns 422 with error details"""
        payload = {
            "name": "TEST_Invalid_Preview",
            "product_type": "finished",
            "lifespan_years": 3,
            "usage": {
                "electricity_kwh_per_cycle": 1.0,
                "electricity_factor_id": "invalid_factor_id_12345",  # Invalid ID
                "cycles_per_year": 50
            },
            "end_of_life": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/preview", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify error structure
        assert "detail" in data
        assert "errors" in data["detail"], f"Expected errors array in detail: {data}"
        assert len(data["detail"]["errors"]) > 0
        
        print(f"Validation errors: {data['detail']['errors']}")


# ============ O3-A5: BACKEND VALIDATION TESTS ============

class TestBackendValidation(TestEmissionFactors):
    """Tests for validation in POST /api/products/enhanced (O3-A5)"""
    
    def test_create_with_empty_name_returns_422(self, api_client):
        """O3-A5: Empty name returns 422 validation error"""
        payload = {
            "name": "",  # Empty name
            "product_type": "finished",
            "lifespan_years": 5,
            "usage": {"cycles_per_year": 100},
            "end_of_life": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/enhanced", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data
        assert "errors" in data["detail"]
        
        # Should contain error about name being required
        errors_joined = " ".join(data["detail"]["errors"])
        assert "nom" in errors_joined.lower() or "obligatoire" in errors_joined.lower(), f"Expected name error: {errors_joined}"
        
        print(f"Validation errors for empty name: {data['detail']['errors']}")
    
    def test_create_with_invalid_factor_id_returns_422(self, api_client):
        """O3-A5: Invalid factor ID returns 422 validation error"""
        payload = {
            "name": "TEST_Invalid_Factor_Product",
            "product_type": "finished",
            "lifespan_years": 5,
            "usage": {
                "electricity_kwh_per_cycle": 1.0,
                "electricity_factor_id": "nonexistent_factor_id",
                "cycles_per_year": 100
            },
            "end_of_life": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/enhanced", json=payload)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data
        assert "errors" in data["detail"]
        
        # Should contain error about factor not found
        errors_joined = " ".join(data["detail"]["errors"])
        assert "facteur" in errors_joined.lower() or "introuvable" in errors_joined.lower() or "invalide" in errors_joined.lower(), f"Expected factor error: {errors_joined}"
        
        print(f"Validation errors for invalid factor: {data['detail']['errors']}")
    
    def test_create_with_valid_data_succeeds(self, api_client, electricity_factor_id, eol_factor_id):
        """O3-A5: Valid data creates product successfully"""
        unique_id = int(time.time())
        payload = {
            "name": f"TEST_Valid_Product_{unique_id}",
            "description": "Test product for validation",
            "product_type": "finished",
            "unit": "unit",
            "lifespan_years": 3,
            "usage": {
                "electricity_kwh_per_cycle": 0.5,
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 200
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 1.5,
                    "unit": "kg"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/enhanced", json=payload)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify product created
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["version"] == 1, "New product should start at version 1"
        assert "total_emissions_per_unit" in data
        
        # Cleanup - delete the test product
        product_id = data["id"]
        api_client.delete(f"{BASE_URL}/api/products/{product_id}")
        
        print(f"Created product: id={data['id']}, version={data['version']}, emissions={data['total_emissions_per_unit']}")
        
        return data


# ============ O3-A2: VERSIONING TESTS ============

class TestVersioning(TestEmissionFactors):
    """Tests for versioning (O3-A2): GET /api/products/{id}/versions"""
    
    @pytest.fixture(scope="class")
    def test_product_for_versioning(self, api_client, electricity_factor_id, eol_factor_id):
        """Create a test product for versioning tests"""
        unique_id = int(time.time())
        payload = {
            "name": f"TEST_Versioning_Product_{unique_id}",
            "product_type": "finished",
            "lifespan_years": 5,
            "usage": {
                "electricity_kwh_per_cycle": 1.0,
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 100
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 2.0,
                    "unit": "kg"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/enhanced", json=payload)
        assert response.status_code == 200, f"Failed to create test product: {response.text}"
        
        product = response.json()
        yield product
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/products/{product['id']}")
    
    def test_versioning_initial_state(self, api_client, test_product_for_versioning):
        """After creation (v1), versions endpoint returns current_version=1 and empty history"""
        product_id = test_product_for_versioning["id"]
        
        response = api_client.get(f"{BASE_URL}/api/products/{product_id}/versions")
        
        assert response.status_code == 200, f"Versions endpoint failed: {response.text}"
        data = response.json()
        
        assert data["product_id"] == product_id
        assert data["current_version"] == 1
        assert data["history"] == [], "Initial product should have empty history"
        
        print(f"Initial version state: current_version={data['current_version']}, history_count={len(data['history'])}")
    
    def test_versioning_after_first_update(self, api_client, test_product_for_versioning, electricity_factor_id, eol_factor_id):
        """After first update (v1->v2), versions endpoint returns current_version=2 and 1 history entry"""
        product_id = test_product_for_versioning["id"]
        
        # Update the product (first update: v1 -> v2)
        update_payload = {
            "name": test_product_for_versioning["name"],
            "product_type": "finished",
            "lifespan_years": 6,  # Changed
            "usage": {
                "electricity_kwh_per_cycle": 1.2,  # Changed
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 120  # Changed
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 2.5,  # Changed
                    "unit": "kg"
                }
            ]
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/products/enhanced/{product_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Check versions
        response = api_client.get(f"{BASE_URL}/api/products/{product_id}/versions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["current_version"] == 2, f"Expected version 2, got {data['current_version']}"
        assert len(data["history"]) == 1, f"Expected 1 history entry, got {len(data['history'])}"
        
        # Verify history entry has version 1
        history_entry = data["history"][0]
        assert history_entry["version"] == 1, f"Expected history version 1, got {history_entry['version']}"
        assert "snapshot_at" in history_entry
        
        print(f"After first update: current_version={data['current_version']}, history=[{history_entry['version']}]")
    
    def test_versioning_after_second_update(self, api_client, test_product_for_versioning, electricity_factor_id, eol_factor_id):
        """After second update (v2->v3), versions endpoint returns current_version=3 and 2 history entries"""
        product_id = test_product_for_versioning["id"]
        
        # Second update (v2 -> v3)
        update_payload = {
            "name": test_product_for_versioning["name"],
            "product_type": "finished",
            "lifespan_years": 7,  # Changed again
            "usage": {
                "electricity_kwh_per_cycle": 1.5,  # Changed again
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 150  # Changed again
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 3.0,  # Changed again
                    "unit": "kg"
                }
            ]
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/products/enhanced/{product_id}", json=update_payload)
        assert update_response.status_code == 200, f"Second update failed: {update_response.text}"
        
        # Check versions
        response = api_client.get(f"{BASE_URL}/api/products/{product_id}/versions")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["current_version"] == 3, f"Expected version 3, got {data['current_version']}"
        assert len(data["history"]) == 2, f"Expected 2 history entries, got {len(data['history'])}"
        
        # Verify history entries have versions 1 and 2
        history_versions = sorted([h["version"] for h in data["history"]])
        assert history_versions == [1, 2], f"Expected history versions [1, 2], got {history_versions}"
        
        print(f"After second update: current_version={data['current_version']}, history_versions={history_versions}")


# ============ O3-A3: RECALCULATE TESTS ============

class TestRecalculate(TestEmissionFactors):
    """Tests for recalculate endpoints (O3-A3)"""
    
    @pytest.fixture(scope="class")
    def test_product_for_recalculate(self, api_client, electricity_factor_id, eol_factor_id):
        """Create a test product for recalculate tests"""
        unique_id = int(time.time())
        payload = {
            "name": f"TEST_Recalculate_Product_{unique_id}",
            "product_type": "finished",
            "lifespan_years": 4,
            "usage": {
                "electricity_kwh_per_cycle": 2.0,
                "electricity_factor_id": electricity_factor_id,
                "cycles_per_year": 50
            },
            "end_of_life": [
                {
                    "emission_factor_id": eol_factor_id,
                    "quantity": 1.0,
                    "unit": "kg"
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/products/enhanced", json=payload)
        assert response.status_code == 200, f"Failed to create test product: {response.text}"
        
        product = response.json()
        product["electricity_factor_id"] = electricity_factor_id
        product["eol_factor_id"] = eol_factor_id
        yield product
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/products/{product['id']}")
    
    def test_recalculate_single_product(self, api_client, test_product_for_recalculate):
        """O3-A3: POST /api/products/{id}/recalculate returns recalculated emissions"""
        product_id = test_product_for_recalculate["id"]
        
        response = api_client.post(f"{BASE_URL}/api/products/{product_id}/recalculate")
        
        assert response.status_code == 200, f"Recalculate failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["product_id"] == product_id
        assert "previous_total" in data
        assert "manufacturing_emissions" in data
        assert "usage_emissions" in data
        assert "disposal_emissions" in data
        assert "total_emissions_per_unit" in data
        assert "changed" in data
        
        # Verify total calculation
        expected_total = data["manufacturing_emissions"] + data["usage_emissions"] + data["disposal_emissions"]
        assert abs(data["total_emissions_per_unit"] - expected_total) < 0.001
        
        print(f"Recalculate result: previous={data['previous_total']}, new={data['total_emissions_per_unit']}, changed={data['changed']}")
    
    def test_recalculate_from_factor(self, api_client, test_product_for_recalculate):
        """O3-A3: POST /api/products/recalculate-from-factor/{factor_id} finds and recalculates affected products"""
        factor_id = test_product_for_recalculate["electricity_factor_id"]
        
        response = api_client.post(f"{BASE_URL}/api/products/recalculate-from-factor/{factor_id}")
        
        assert response.status_code == 200, f"Recalculate from factor failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["factor_id"] == factor_id
        assert "affected_products" in data
        assert "products" in data
        assert isinstance(data["products"], list)
        
        # Should find at least our test product
        assert data["affected_products"] >= 1, f"Expected at least 1 affected product, got {data['affected_products']}"
        
        # Verify product entry structure
        if len(data["products"]) > 0:
            product_entry = data["products"][0]
            assert "product_id" in product_entry
            assert "name" in product_entry
            assert "previous_total" in product_entry
            assert "new_total" in product_entry
            assert "changed" in product_entry
        
        print(f"Recalculate from factor result: affected_products={data['affected_products']}")
    
    def test_recalculate_from_invalid_factor_returns_error(self, api_client):
        """O3-A3: POST /api/products/recalculate-from-factor/{invalid_id} returns appropriate error"""
        invalid_factor_id = "invalid_factor_12345"
        
        response = api_client.post(f"{BASE_URL}/api/products/recalculate-from-factor/{invalid_factor_id}")
        
        # Should return 400 for invalid factor ID format
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}: {response.text}"
        
        print(f"Invalid factor ID response: {response.status_code}, {response.text[:200]}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
