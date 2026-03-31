"""
Admin Panel API Tests
Tests for admin-only endpoints: user management and emission factor management
"""
import pytest
import requests
import os
import uuid
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_USER_EMAIL, TEST_USER_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "newtest@x.com"
# credentials imported from conftest_credentials
REGULAR_USER_EMAIL = "regular_user_test@test.com"
# credentials imported from conftest_credentials


class TestAdminAuthentication:
    """Test admin authentication and role-based access"""
    
    def test_admin_login_success(self):
        """Admin user can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin", f"Expected admin role, got: {data['user']['role']}"
    
    def test_regular_user_login_success(self):
        """Regular user can login successfully"""
        # First try to register the regular user if not exists
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Regular Test User",
            "role": "user"
        })
        
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200, f"Regular user login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "user", f"Expected user role, got: {data['user']['role']}"


class TestAdminUsersEndpoint:
    """Test /api/admin/users endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def regular_user_token(self):
        """Get regular user authentication token"""
        # Ensure user exists
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Regular Test User",
            "role": "user"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Regular user authentication failed")
    
    def test_admin_can_get_users_list(self, admin_token):
        """Admin can access /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin users list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        assert len(data) > 0, "Expected at least one user"
        
        # Verify user structure
        user = data[0]
        assert "id" in user
        assert "email" in user
        assert "role" in user
        assert "password" not in user, "Password should not be exposed"
    
    def test_regular_user_cannot_access_admin_users(self, regular_user_token):
        """Regular user gets 403 when accessing /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    def test_unauthenticated_cannot_access_admin_users(self):
        """Unauthenticated request gets 401/403 when accessing /api/admin/users"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAdminUserRoleManagement:
    """Test user role management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def regular_user_token(self):
        """Get regular user authentication token"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Regular Test User",
            "role": "user"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Regular user authentication failed")
    
    def test_admin_can_promote_user_to_admin(self, admin_token):
        """Admin can change user role to admin"""
        # First get users list to find a user to promote
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json()
        
        # Find a non-admin user
        target_user = None
        for user in users:
            if user["role"] == "user":
                target_user = user
                break
        
        if not target_user:
            pytest.skip("No regular user found to test role change")
        
        # Promote to admin
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user['id']}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"role": "admin"}
        )
        assert response.status_code == 200, f"Role update failed: {response.text}"
        
        # Demote back to user
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user['id']}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"role": "user"}
        )
        assert response.status_code == 200, f"Role revert failed: {response.text}"
    
    def test_regular_user_cannot_change_roles(self, regular_user_token, admin_token):
        """Regular user cannot change user roles"""
        # Get a user ID
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json()
        target_user = users[0]
        
        # Try to change role as regular user
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user['id']}/role",
            headers={"Authorization": f"Bearer {regular_user_token}"},
            json={"role": "admin"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_invalid_role_rejected(self, admin_token):
        """Invalid role values are rejected"""
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json()
        target_user = users[0]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target_user['id']}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"role": "superadmin"}  # Invalid role
        )
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"


class TestAdminEmissionFactors:
    """Test admin emission factors CRUD endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def regular_user_token(self):
        """Get regular user authentication token"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Regular Test User",
            "role": "user"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Regular user authentication failed")
    
    def test_admin_can_get_emission_factors(self, admin_token):
        """Admin can access /api/admin/emission-factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get emission factors failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of emission factors"
    
    def test_regular_user_cannot_access_admin_emission_factors(self, regular_user_token):
        """Regular user gets 403 when accessing /api/admin/emission-factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_can_create_emission_factor(self, admin_token):
        """Admin can create new emission factor"""
        unique_name = f"TEST_Factor_{uuid.uuid4().hex[:8]}"
        factor_data = {
            "name": unique_name,
            "category": "combustion_mobile",
            "scope": "scope1",
            "value": 2.5,
            "unit": "kgCO2e/L",
            "source": "TEST",
            "tags": ["test", "diesel"],
            "region": "Suisse"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=factor_data
        )
        assert response.status_code == 200, f"Create emission factor failed: {response.text}"
        data = response.json()
        assert data["name"] == unique_name
        assert data["value"] == 2.5
        assert "id" in data
        
        # Cleanup - delete the test factor
        factor_id = data["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_can_update_emission_factor(self, admin_token):
        """Admin can update emission factor"""
        # First create a factor
        unique_name = f"TEST_Factor_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": unique_name,
                "category": "combustion_mobile",
                "scope": "scope1",
                "value": 2.5,
                "unit": "kgCO2e/L",
                "source": "TEST",
                "tags": ["test"],
                "region": "Suisse"
            }
        )
        factor_id = create_response.json()["id"]
        
        # Update the factor
        update_response = requests.put(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"value": 3.0, "source": "UPDATED_TEST"}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated_data = update_response.json()
        assert updated_data["value"] == 3.0
        assert updated_data["source"] == "UPDATED_TEST"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_can_delete_emission_factor(self, admin_token):
        """Admin can delete emission factor"""
        # First create a factor
        unique_name = f"TEST_Factor_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": unique_name,
                "category": "combustion_mobile",
                "scope": "scope1",
                "value": 2.5,
                "unit": "kgCO2e/L",
                "source": "TEST",
                "tags": ["test"],
                "region": "Suisse"
            }
        )
        factor_id = create_response.json()["id"]
        
        # Delete the factor
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/emission-factors/{factor_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion - should get 404
        get_response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        factors = get_response.json()
        factor_ids = [f["id"] for f in factors]
        assert factor_id not in factor_ids, "Factor should be deleted"
    
    def test_regular_user_cannot_create_emission_factor(self, regular_user_token):
        """Regular user cannot create emission factor"""
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors",
            headers={"Authorization": f"Bearer {regular_user_token}"},
            json={
                "name": "TEST_Unauthorized",
                "category": "combustion_mobile",
                "scope": "scope1",
                "value": 2.5,
                "unit": "kgCO2e/L",
                "source": "TEST",
                "tags": ["test"],
                "region": "Suisse"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestAdminEmissionFactorsExportImport:
    """Test admin emission factors export/import endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def regular_user_token(self):
        """Get regular user authentication token"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Regular Test User",
            "role": "user"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Regular user authentication failed")
    
    def test_admin_can_export_emission_factors(self, admin_token):
        """Admin can export emission factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors/export",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        data = response.json()
        assert "factors" in data
        assert "count" in data
        assert isinstance(data["factors"], list)
    
    def test_regular_user_cannot_export_emission_factors(self, regular_user_token):
        """Regular user cannot export emission factors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emission-factors/export",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_can_import_emission_factors(self, admin_token):
        """Admin can import emission factors"""
        unique_name = f"TEST_Import_{uuid.uuid4().hex[:8]}"
        import_data = {
            "factors": [
                {
                    "name": unique_name,
                    "category": "combustion_mobile",
                    "scope": "scope1",
                    "value": 2.5,
                    "unit": "kgCO2e/L",
                    "source": "IMPORT_TEST",
                    "tags": ["test", "import"],
                    "region": "Suisse"
                }
            ],
            "replace_all": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=import_data
        )
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "1" in data["message"]  # Should mention 1 factor imported
    
    def test_regular_user_cannot_import_emission_factors(self, regular_user_token):
        """Regular user cannot import emission factors"""
        response = requests.post(
            f"{BASE_URL}/api/admin/emission-factors/import",
            headers={"Authorization": f"Bearer {regular_user_token}"},
            json={"factors": [], "replace_all": False}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
