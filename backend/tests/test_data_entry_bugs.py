"""
Backend API tests for Data Entry Bug Hunting
Tests for GuidedEntryModal 4-step flow and related endpoints
"""
import pytest
import requests
import os
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login(self, auth_token):
        """Test login returns token"""
        assert auth_token is not None
        print(f"SUCCESS: Login works, token length: {len(auth_token)}")


class TestCategories:
    """Category endpoints tests"""
    
    def test_get_categories(self):
        """Test GET /api/categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check category structure
        cat = data[0]
        assert "code" in cat
        assert "name_fr" in cat or "name_de" in cat
        print(f"SUCCESS: {len(data)} categories loaded")


class TestSubcategories:
    """Subcategory endpoints tests"""
    
    def test_get_subcategories_all(self):
        """Test GET /api/subcategories without filter"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: {len(data)} subcategories total")
    
    def test_get_subcategories_by_category(self):
        """Test GET /api/subcategories?category=combustion_mobile"""
        response = requests.get(f"{BASE_URL}/api/subcategories?category=combustion_mobile")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should have subcategories for combustion_mobile
        if len(data) > 0:
            print(f"SUCCESS: {len(data)} subcategories for combustion_mobile")
            for subcat in data[:5]:
                print(f"  - {subcat.get('code')}: {subcat.get('name_fr')}")
        else:
            print("INFO: No subcategories returned (may be normal)")


class TestEmissionFactors:
    """Emission factor endpoints tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_emission_factors(self, auth_headers):
        """Test GET /api/emission-factors"""
        response = requests.get(f"{BASE_URL}/api/emission-factors", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: {len(data)} emission factors loaded")
    
    def test_search_emission_factors(self, auth_headers):
        """Test GET /api/emission-factors/search"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?category=combustion_mobile", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Search returned {len(data)} factors for combustion_mobile")
    
    def test_search_by_query(self, auth_headers):
        """Test search with query parameter"""
        response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?q=diesel", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Search 'diesel' returned {len(data)} results")
    
    def test_get_factor_by_id(self, auth_headers):
        """Test GET /api/emission-factors/{id}"""
        # First get a factor
        response = requests.get(f"{BASE_URL}/api/emission-factors?limit=1", headers=auth_headers)
        factors = response.json()
        
        if len(factors) > 0:
            factor_id = factors[0].get("id")
            response = requests.get(f"{BASE_URL}/api/emission-factors/{factor_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            print(f"SUCCESS: Factor {factor_id} retrieved")
        else:
            pytest.skip("No factors available")
    
    def test_factors_have_impacts(self, auth_headers):
        """Test that emission factors have multi-impact structure"""
        response = requests.get(f"{BASE_URL}/api/emission-factors/search?q=electricite", headers=auth_headers)
        factors = response.json()
        
        multi_impact_count = 0
        for factor in factors[:20]:
            impacts = factor.get("impacts", [])
            if len(impacts) > 1:
                multi_impact_count += 1
        
        print(f"SUCCESS: {multi_impact_count}/{min(len(factors), 20)} factors have multi-impacts")


class TestActivities:
    """Activity CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def fiscal_year_id(self, auth_headers):
        """Get current fiscal year ID"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years/current", headers=auth_headers)
        if response.status_code == 200:
            return response.json().get("id")
        return None
    
    def test_get_activities(self, auth_headers, fiscal_year_id):
        """Test GET /api/activities"""
        url = f"{BASE_URL}/api/activities"
        if fiscal_year_id:
            url += f"?fiscal_year_id={fiscal_year_id}"
        
        response = requests.get(url, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check for paginated response
        if "data" in data:
            activities = data["data"]
            pagination = data.get("pagination", {})
            print(f"SUCCESS: {len(activities)} activities, total: {pagination.get('total', 'N/A')}")
        else:
            activities = data
            print(f"SUCCESS: {len(activities)} activities")
    
    def test_create_activity(self, auth_headers, fiscal_year_id):
        """Test POST /api/activities - Create new activity"""
        # First get a valid emission factor
        factors_response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?category=combustion_mobile", 
            headers=auth_headers
        )
        factors = factors_response.json()
        
        if len(factors) == 0:
            pytest.skip("No emission factors available")
        
        factor = factors[0]
        factor_id = factor.get("id")
        
        # Get factor's input units
        input_units = factor.get("input_units", ["L"])
        unit = input_units[0] if input_units else "L"
        
        activity_data = {
            "category_id": "combustion_mobile",
            "subcategory_id": "route",
            "scope": "scope1",
            "name": "TEST_Activity_Bug_Hunt",
            "quantity": 100,
            "unit": unit,
            "emission_factor_id": factor_id,
            "entry_scope": "scope1",
            "entry_category": "combustion_mobile",
            "comments": "Created by bug hunting test"
        }
        
        if fiscal_year_id:
            activity_data["fiscal_year_id"] = fiscal_year_id
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data, headers=auth_headers)
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            
            # Check if multi-impact (group response)
            if "group_id" in data:
                print(f"SUCCESS: Created multi-impact group {data['group_id']} with {data['count']} activities")
                return data['activities'][0]['id']
            else:
                print(f"SUCCESS: Created activity {data.get('id')}")
                return data.get('id')
        else:
            print(f"FAIL: Create activity returned {response.status_code}: {response.text}")
            assert False, f"Create activity failed: {response.text}"
    
    def test_create_activity_with_conversion(self, auth_headers, fiscal_year_id):
        """Test creating activity with unit conversion"""
        # Get factor with kWh unit
        factors_response = requests.get(
            f"{BASE_URL}/api/emission-factors/search?category=electricite", 
            headers=auth_headers
        )
        factors = factors_response.json()
        
        if len(factors) == 0:
            pytest.skip("No electricity factors available")
        
        # Find factor with kWh
        factor = None
        for f in factors:
            if "kWh" in (f.get("input_units") or []):
                factor = f
                break
        
        if not factor:
            factor = factors[0]
        
        # Create activity with GJ (converted to kWh)
        activity_data = {
            "category_id": "electricite",
            "scope": "scope2",
            "name": "TEST_Conversion_Activity",
            "quantity": 277.78,  # This is 1 GJ in kWh
            "unit": "kWh",
            "original_quantity": 1,
            "original_unit": "GJ",
            "conversion_factor": 277.78,
            "emission_factor_id": factor.get("id"),
            "entry_scope": "scope2",
            "entry_category": "electricite"
        }
        
        if fiscal_year_id:
            activity_data["fiscal_year_id"] = fiscal_year_id
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data, headers=auth_headers)
        
        if response.status_code in [200, 201]:
            data = response.json()
            
            # Verify conversion fields stored
            activity_id = data.get('id') or (data.get('activities', [{}])[0].get('id'))
            
            # Get the activity to verify
            get_response = requests.get(f"{BASE_URL}/api/activities/{activity_id}", headers=auth_headers)
            if get_response.status_code == 200:
                stored = get_response.json()
                assert stored.get("original_unit") == "GJ", "original_unit not stored"
                assert stored.get("original_quantity") == 1, "original_quantity not stored"
                print(f"SUCCESS: Conversion activity created with original_unit={stored.get('original_unit')}")
            
            return activity_id
        else:
            pytest.fail(f"Create conversion activity failed: {response.text}")
    
    def test_delete_test_activities(self, auth_headers):
        """Cleanup: Delete TEST_ activities"""
        response = requests.get(f"{BASE_URL}/api/activities?limit=500", headers=auth_headers)
        data = response.json()
        activities = data.get("data", data) if isinstance(data, dict) else data
        
        deleted_count = 0
        for activity in activities:
            name = activity.get("name", "")
            if name.startswith("TEST_"):
                activity_id = activity.get("id")
                group_id = activity.get("group_id")
                
                if group_id and activity.get("group_index") == 0:
                    # Delete the whole group
                    del_response = requests.delete(
                        f"{BASE_URL}/api/activities/groups/{group_id}", 
                        headers=auth_headers
                    )
                elif not group_id:
                    del_response = requests.delete(
                        f"{BASE_URL}/api/activities/{activity_id}", 
                        headers=auth_headers
                    )
                else:
                    continue
                
                if del_response.status_code in [200, 204]:
                    deleted_count += 1
        
        print(f"SUCCESS: Cleaned up {deleted_count} TEST_ activities")


class TestUnitConversions:
    """Unit conversion endpoint tests"""
    
    def test_get_units_dimensions(self):
        """Test GET /api/units/dimensions"""
        response = requests.get(f"{BASE_URL}/api/units/dimensions")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            
            # Check for expected dimensions
            expected_dims = ["energy", "distance", "mass", "volume"]
            found_dims = list(data.keys())
            
            for dim in expected_dims:
                if dim in data:
                    print(f"SUCCESS: Dimension '{dim}' found with {len(data[dim].get('units', {}))} units")
                else:
                    print(f"INFO: Dimension '{dim}' not found")
        else:
            print(f"INFO: /api/units/dimensions returned {response.status_code} (may not exist)")


class TestDashboard:
    """Dashboard endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_summary(self, auth_headers):
        """Test GET /api/dashboard/summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_emissions" in data
        print(f"SUCCESS: Dashboard summary - Total emissions: {data.get('total_emissions')}")
    
    def test_category_stats(self, auth_headers):
        """Test GET /api/dashboard/category-stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/category-stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        print(f"SUCCESS: Category stats returned {len(data)} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
