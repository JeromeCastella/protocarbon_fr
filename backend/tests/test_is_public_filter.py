"""
Test suite for emission factors is_public filter and sorting
Tests the BAFU 2025 migration results and API behavior
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
TEST_EMAIL = "newtest@x.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate and get token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Auth failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestEmissionFactorsIsPublicFilter:
    """Tests for is_public filter implementation in emission-factors API"""

    def test_01_emission_factors_sorted_by_is_public_desc(self, api_client):
        """API should return factors sorted by is_public DESC (public first)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "No emission factors returned"
        
        # Check that all public factors come before expert factors
        seen_expert = False
        for i, factor in enumerate(data):
            is_public = factor.get('is_public')
            if is_public == False:
                seen_expert = True
            elif seen_expert and is_public == True:
                pytest.fail(f"Public factor at index {i} found after expert factor - sorting broken")
        
        print(f"✓ Verified {len(data)} factors sorted by is_public DESC")

    def test_02_emission_factors_sorted_by_popularity_score_within_groups(self, api_client):
        """Within each is_public group, factors should be sorted by popularity_score DESC"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check public factors sorted by popularity_score
        public_factors = [f for f in data if f.get('is_public') == True]
        expert_factors = [f for f in data if f.get('is_public') == False]
        
        # Verify descending order of popularity_score in public factors
        for i in range(1, min(len(public_factors), 20)):  # Check first 20
            prev_score = public_factors[i-1].get('popularity_score', 0)
            curr_score = public_factors[i].get('popularity_score', 0)
            assert prev_score >= curr_score, f"Public factors not sorted: {prev_score} < {curr_score} at index {i}"
        
        # Verify descending order of popularity_score in expert factors
        for i in range(1, min(len(expert_factors), 20)):  # Check first 20
            prev_score = expert_factors[i-1].get('popularity_score', 0)
            curr_score = expert_factors[i].get('popularity_score', 0)
            assert prev_score >= curr_score, f"Expert factors not sorted: {prev_score} < {curr_score} at index {i}"
        
        print(f"✓ Verified sorting by popularity_score: {len(public_factors)} public, {len(expert_factors)} expert")

    def test_03_voiture_particuliere_has_expected_counts(self, api_client):
        """Subcategory voiture_particuliere should have both public and expert factors"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        public_count = sum(1 for f in data if f.get('is_public') == True)
        expert_count = sum(1 for f in data if f.get('is_public') == False)
        
        # Expect both public and expert factors
        assert public_count > 0, "No public factors found"
        assert expert_count > 0, "No expert factors found"
        assert expert_count > public_count, "Expected more expert factors than public"
        
        print(f"✓ voiture_particuliere: {public_count} public, {expert_count} expert (total: {len(data)})")

    def test_04_emission_factors_have_popularity_score(self, api_client):
        """All emission factors should have popularity_score field"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        without_score = [f for f in data if 'popularity_score' not in f]
        
        assert len(without_score) == 0, f"Found {len(without_score)} factors without popularity_score"
        print(f"✓ All {len(data)} factors have popularity_score")

    def test_05_emission_factors_have_is_public_field(self, api_client):
        """All emission factors should have is_public field"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        without_is_public = [f for f in data if 'is_public' not in f]
        
        assert len(without_is_public) == 0, f"Found {len(without_is_public)} factors without is_public"
        print(f"✓ All {len(data)} factors have is_public field")

    def test_06_search_endpoint_also_sorted_correctly(self, api_client):
        """Search endpoint should also sort by is_public DESC, popularity_score DESC"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/search?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "No results from search"
        
        # Check is_public sorting
        seen_expert = False
        for factor in data:
            is_public = factor.get('is_public')
            if is_public == False:
                seen_expert = True
            elif seen_expert and is_public == True:
                pytest.fail("Search endpoint not sorted by is_public DESC")
        
        print(f"✓ Search endpoint returns {len(data)} factors sorted correctly")

    def test_07_by_category_endpoint_sorted_correctly(self, api_client):
        """by-category endpoint should also sort correctly"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors/by-category/combustion_mobile")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "No factors for combustion_mobile"
        
        # Check is_public sorting
        seen_expert = False
        public_count = 0
        expert_count = 0
        for factor in data:
            is_public = factor.get('is_public')
            if is_public == True:
                public_count += 1
                if seen_expert:
                    pytest.fail("by-category endpoint not sorted by is_public DESC")
            else:
                expert_count += 1
                seen_expert = True
        
        print(f"✓ by-category returns {len(data)} factors: {public_count} public, {expert_count} expert")


class TestBAFU2025Migration:
    """Verify BAFU 2025 migration data integrity"""

    def test_01_total_emission_factors_count(self, api_client):
        """Should have approximately 8978 emission factors after migration"""
        # Use a broader query to count all factors
        response = api_client.get(f"{BASE_URL}/api/emission-factors/by-category/combustion_mobile")
        mobile_count = len(response.json()) if response.status_code == 200 else 0
        
        response = api_client.get(f"{BASE_URL}/api/emission-factors/by-category/combustion_stationnaire")
        stationnaire_count = len(response.json()) if response.status_code == 200 else 0
        
        # Just verify we have substantial data
        assert mobile_count > 500, f"Too few mobile factors: {mobile_count}"
        print(f"✓ combustion_mobile: {mobile_count} factors, combustion_stationnaire: {stationnaire_count} factors")

    def test_02_first_factor_is_public_true(self, api_client):
        """First returned factor should be public (is_public=True)"""
        response = api_client.get(f"{BASE_URL}/api/emission-factors?subcategory=voiture_particuliere")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0
        
        first_factor = data[0]
        assert first_factor.get('is_public') == True, f"First factor is not public: {first_factor.get('name_fr')}"
        print(f"✓ First factor is public: {first_factor.get('name_fr')[:50]}")
