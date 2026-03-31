"""
Test consecutive inline edits for name_simple_fr and name_simple_de
This tests the bug fix for:
1. Copy-paste not working
2. First manual edit works, but subsequent edits fail
3. Cell shows empty after failure but text reappears in edit mode

Backend API test: Multiple consecutive PATCH calls to same factor
"""
import pytest
import requests
import os
import time
from tests.conftest_credentials import TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# credentials from conftest_credentials
# credentials from conftest_credentials


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def session(auth_token):
    """Create session with auth header"""
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return s


@pytest.fixture(scope="module")
def test_factor(session):
    """Get a factor to test with and restore it after tests"""
    response = session.get(f"{BASE_URL}/api/curation/factors", params={
        "page": 1,
        "page_size": 1
    })
    assert response.status_code == 200
    factor = response.json()["items"][0]
    factor_id = factor.get("id")
    
    # Store original values
    original = {
        "name_simple_fr": factor.get("name_simple_fr"),
        "name_simple_de": factor.get("name_simple_de"),
    }
    
    yield {"id": factor_id, "original": original, "name_fr": factor.get("name_fr")}
    
    # Restore original values after tests
    session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
        "name_simple_fr": original["name_simple_fr"] or factor.get("name_fr"),
        "name_simple_de": original["name_simple_de"] or factor.get("name_de"),
    })


class TestConsecutiveInlineEdits:
    """Test multiple consecutive PATCH calls to same factor"""

    def test_first_edit_name_simple_fr_persists(self, session, test_factor):
        """First edit to name_simple_fr should persist"""
        factor_id = test_factor["id"]
        
        # First edit
        test_value_1 = "TEST_Premier_Edit_FR"
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_value_1
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_value_1, \
            f"First edit should persist. Expected '{test_value_1}', got '{updated.get('name_simple_fr')}'"
        
        # Verify by fetching again
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 1,
            "search": factor_id[:10]
        })
        assert response.status_code == 200
        print(f"✓ First edit persisted: '{test_value_1}'")

    def test_second_edit_name_simple_fr_persists(self, session, test_factor):
        """Second consecutive edit to name_simple_fr should also persist"""
        factor_id = test_factor["id"]
        
        # Second edit (immediately after first)
        test_value_2 = "TEST_Deuxieme_Edit_FR"
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_value_2
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_value_2, \
            f"Second edit should persist. Expected '{test_value_2}', got '{updated.get('name_simple_fr')}'"
        print(f"✓ Second edit persisted: '{test_value_2}'")

    def test_third_edit_name_simple_fr_persists(self, session, test_factor):
        """Third consecutive edit should also persist"""
        factor_id = test_factor["id"]
        
        # Third edit
        test_value_3 = "TEST_Troisieme_Edit_FR"
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_value_3
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_value_3, \
            f"Third edit should persist. Expected '{test_value_3}', got '{updated.get('name_simple_fr')}'"
        print(f"✓ Third edit persisted: '{test_value_3}'")

    def test_edit_name_simple_de_persists(self, session, test_factor):
        """Edit to name_simple_de should persist"""
        factor_id = test_factor["id"]
        
        test_value_de = "TEST_Erster_Edit_DE"
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_de": test_value_de
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_de") == test_value_de, \
            f"DE edit should persist. Expected '{test_value_de}', got '{updated.get('name_simple_de')}'"
        print(f"✓ DE edit persisted: '{test_value_de}'")

    def test_rapid_consecutive_edits(self, session, test_factor):
        """Rapid consecutive edits (simulating fast typing/paste) should all persist"""
        factor_id = test_factor["id"]
        
        # Simulate rapid edits (like paste or fast typing)
        values = [
            "TEST_Rapide_1",
            "TEST_Rapide_2",
            "TEST_Rapide_3",
            "TEST_Rapide_Final"
        ]
        
        for i, value in enumerate(values):
            response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
                "name_simple_fr": value
            })
            assert response.status_code == 200
            updated = response.json()
            assert updated.get("name_simple_fr") == value, \
                f"Rapid edit {i+1} should persist. Expected '{value}', got '{updated.get('name_simple_fr')}'"
        
        # Final verification
        response = session.get(f"{BASE_URL}/api/curation/factors", params={
            "page": 1,
            "page_size": 100,
            "search": factor_id[:10]
        })
        assert response.status_code == 200
        items = response.json()["items"]
        # Find our factor
        found = None
        for item in items:
            if item.get("id") == factor_id:
                found = item
                break
        
        if found:
            assert found.get("name_simple_fr") == values[-1], \
                f"Final value should be '{values[-1]}', got '{found.get('name_simple_fr')}'"
        print(f"✓ All {len(values)} rapid edits persisted correctly")

    def test_edit_both_fields_simultaneously(self, session, test_factor):
        """Editing both FR and DE in same request should persist"""
        factor_id = test_factor["id"]
        
        test_fr = "TEST_Simultane_FR"
        test_de = "TEST_Simultane_DE"
        
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_fr,
            "name_simple_de": test_de
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_fr
        assert updated.get("name_simple_de") == test_de
        print(f"✓ Simultaneous FR/DE edit persisted")

    def test_edit_with_special_characters(self, session, test_factor):
        """Edit with special characters (accents, umlauts) should persist"""
        factor_id = test_factor["id"]
        
        test_fr = "TEST_Énergie_électrique_été"
        test_de = "TEST_Wärmeübertragung_Größe"
        
        response = session.patch(f"{BASE_URL}/api/curation/factors/{factor_id}", json={
            "name_simple_fr": test_fr,
            "name_simple_de": test_de
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("name_simple_fr") == test_fr, \
            f"FR with accents should persist. Expected '{test_fr}', got '{updated.get('name_simple_fr')}'"
        assert updated.get("name_simple_de") == test_de, \
            f"DE with umlauts should persist. Expected '{test_de}', got '{updated.get('name_simple_de')}'"
        print(f"✓ Special characters (accents, umlauts) persisted correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
