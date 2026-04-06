"""
Phase C - React Hooks Dependency Refactoring Tests
Tests to verify that all backend APIs work correctly after Phase C refactoring.
Focus: Verify no regressions in API responses after useCallback/useMemo changes.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


class TestPhaseC_BackendAPIs:
    """Test all backend APIs used by refactored hooks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get current fiscal year
        fy_response = self.session.get(f"{BASE_URL}/api/fiscal-years/current")
        if fy_response.status_code == 200:
            self.fiscal_year_id = fy_response.json().get("id")
        else:
            # Fallback to first fiscal year
            fy_list = self.session.get(f"{BASE_URL}/api/fiscal-years").json()
            self.fiscal_year_id = fy_list[0]["id"] if fy_list else None
    
    # ─── AuthContext APIs ───
    
    def test_auth_me(self):
        """Test /api/auth/me - used by fetchUser in AuthContext"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == TEST_EMAIL
        print("✓ /api/auth/me works correctly")
    
    # ─── useDashboard APIs ───
    
    def test_dashboard_summary(self):
        """Test /api/dashboard/summary - used by fetchAllData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_emissions" in data or "scope_emissions" in data
        print("✓ /api/dashboard/summary works correctly")
    
    def test_dashboard_summary_with_fiscal_year(self):
        """Test /api/dashboard/summary with fiscal_year_id param"""
        if not self.fiscal_year_id:
            pytest.skip("No fiscal year available")
        response = self.session.get(f"{BASE_URL}/api/dashboard/summary?fiscal_year_id={self.fiscal_year_id}")
        assert response.status_code == 200
        print("✓ /api/dashboard/summary with fiscal_year_id works correctly")
    
    def test_dashboard_kpis(self):
        """Test /api/dashboard/kpis - used by fetchAllData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        print("✓ /api/dashboard/kpis works correctly")
    
    def test_dashboard_fiscal_comparison(self):
        """Test /api/dashboard/fiscal-comparison - used by fetchAllData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/fiscal-comparison")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/dashboard/fiscal-comparison works correctly")
    
    def test_dashboard_scope_breakdown(self):
        """Test /api/dashboard/scope-breakdown - used by fetchScopeBreakdown in useDashboard"""
        if not self.fiscal_year_id:
            pytest.skip("No fiscal year available")
        response = self.session.get(f"{BASE_URL}/api/dashboard/scope-breakdown/{self.fiscal_year_id}")
        assert response.status_code == 200
        data = response.json()
        assert "scopes" in data or "total" in data
        print("✓ /api/dashboard/scope-breakdown works correctly")
    
    def test_objectives(self):
        """Test /api/objectives - used by fetchObjectiveData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/objectives")
        assert response.status_code in [200, 404]  # 404 if no objective exists
        print("✓ /api/objectives works correctly")
    
    def test_objectives_trajectory(self):
        """Test /api/objectives/trajectory - used by fetchObjectiveData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/objectives/trajectory")
        assert response.status_code == 200
        data = response.json()
        assert "trajectory" in data or "actuals" in data
        print("✓ /api/objectives/trajectory works correctly")
    
    def test_scenarios(self):
        """Test /api/scenarios - used by fetchScenarioEntities in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/scenarios")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/scenarios works correctly")
    
    # ─── useGuidedEntry APIs ───
    
    def test_subcategories(self):
        """Test /api/subcategories - used by fetchSubcategories in useGuidedEntry"""
        response = self.session.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/subcategories works correctly")
    
    def test_emission_factors_search(self):
        """Test /api/emission-factors/search - used by fetchFactorsForCategory in useGuidedEntry"""
        response = self.session.get(f"{BASE_URL}/api/emission-factors/search?category=combustion_fixe")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/emission-factors/search works correctly")
    
    def test_emission_factors_by_subcategory(self):
        """Test /api/emission-factors - used by fetchFactorsForSubcategory in useGuidedEntry"""
        response = self.session.get(f"{BASE_URL}/api/emission-factors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/emission-factors works correctly")
    
    # ─── useAdminExport APIs ───
    
    def test_fiscal_years(self):
        """Test /api/fiscal-years - used by fetchFiscalYears in useAdminExport"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print("✓ /api/fiscal-years works correctly")
    
    def test_export_mongodump_info(self):
        """Test /api/export/mongodump/info - used by fetchDumpInfo in useAdminExport"""
        response = self.session.get(f"{BASE_URL}/api/export/mongodump/info")
        assert response.status_code == 200
        data = response.json()
        assert "db_name" in data or "collections" in data
        print("✓ /api/export/mongodump/info works correctly")
    
    # ─── useProductVersions APIs ───
    
    def test_products(self):
        """Test /api/products - used by fetchData in useProductVersions"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/products works correctly")
    
    def test_product_emission_profiles(self):
        """Test /api/products/{id}/emission-profiles - used by fetchData in useProductVersions"""
        # First get a product
        products_response = self.session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/products/{product_id}/emission-profiles")
        assert response.status_code == 200
        data = response.json()
        assert "default_profile" in data or "profiles" in data
        print("✓ /api/products/{id}/emission-profiles works correctly")
    
    # ─── useProductSale APIs ───
    
    def test_product_sales(self):
        """Test /api/products/{id}/sales - used by fetchProductSales in useProductSale"""
        products_response = self.session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/products/{product_id}/sales")
        assert response.status_code == 200
        data = response.json()
        assert "sales" in data
        print("✓ /api/products/{id}/sales works correctly")
    
    # ─── useAssistance APIs ───
    
    def test_emission_factors_list(self):
        """Test /api/emission-factors - used by fetchFactors in useAssistance"""
        response = self.session.get(f"{BASE_URL}/api/emission-factors")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/emission-factors (list) works correctly")
    
    # ─── useFiscalYearsPage APIs ───
    
    def test_fiscal_years_current(self):
        """Test /api/fiscal-years/current - used in useFiscalYearsPage"""
        response = self.session.get(f"{BASE_URL}/api/fiscal-years/current")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print("✓ /api/fiscal-years/current works correctly")
    
    # ─── GeneralInfo APIs ───
    
    def test_companies(self):
        """Test /api/companies - used by fetchData in useGeneralInfo"""
        response = self.session.get(f"{BASE_URL}/api/companies")
        assert response.status_code == 200
        print("✓ /api/companies works correctly")
    
    def test_categories(self):
        """Test /api/categories - used by fetchData in useGeneralInfo"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/categories works correctly")
    
    def test_fiscal_year_context(self):
        """Test /api/fiscal-years/{id}/context - used by fetchFiscalYearContext in GeneralInfo"""
        if not self.fiscal_year_id:
            pytest.skip("No fiscal year available")
        response = self.session.get(f"{BASE_URL}/api/fiscal-years/{self.fiscal_year_id}/context")
        assert response.status_code == 200
        print("✓ /api/fiscal-years/{id}/context works correctly")
    
    # ─── Activities APIs ───
    
    def test_activities(self):
        """Test /api/activities - used by fetchAllData in useDashboard"""
        response = self.session.get(f"{BASE_URL}/api/activities?limit=100")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data or isinstance(data, list)
        print("✓ /api/activities works correctly")
    
    def test_activities_with_fiscal_year(self):
        """Test /api/activities with fiscal_year_id param"""
        if not self.fiscal_year_id:
            pytest.skip("No fiscal year available")
        response = self.session.get(f"{BASE_URL}/api/activities?limit=100&fiscal_year_id={self.fiscal_year_id}")
        assert response.status_code == 200
        print("✓ /api/activities with fiscal_year_id works correctly")
    
    # ─── Dashboard Category Stats ───
    
    def test_dashboard_category_stats(self):
        """Test /api/dashboard/category-stats - used in DataEntry"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/category-stats")
        assert response.status_code == 200
        print("✓ /api/dashboard/category-stats works correctly")
    
    # ─── Emission Factors Search Index ───
    
    def test_emission_factors_search_index(self):
        """Test /api/emission-factors/search-index - used in GlobalFactorSearch"""
        response = self.session.get(f"{BASE_URL}/api/emission-factors/search-index")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print("✓ /api/emission-factors/search-index works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
