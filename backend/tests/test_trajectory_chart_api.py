"""
Backend API tests for trajectory chart redesign
Tests the /api/objectives/trajectory endpoint returns separate scope values
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://compact-factors.preview.emergentagent.com')

class TestTrajectoryChartAPI:
    """Tests for trajectory chart API - verifies scope data separation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@x.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_trajectory_endpoint_returns_200(self):
        """Test that trajectory endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Trajectory endpoint returns 200")
    
    def test_trajectory_returns_actuals_with_separate_scopes(self):
        """Test that actuals contain actual_scope1, actual_scope2, actual_scope3 separately"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check actuals structure
        assert "actuals" in data, "Response missing 'actuals' key"
        actuals = data["actuals"]
        
        if len(actuals) > 0:
            first_actual = actuals[0]
            # Verify separate scope fields exist
            assert "actual_scope1" in first_actual, "Missing actual_scope1 in actuals"
            assert "actual_scope2" in first_actual, "Missing actual_scope2 in actuals"
            assert "actual_scope3" in first_actual, "Missing actual_scope3 in actuals"
            
            # Verify old combined field does NOT exist
            assert "actual_scope1_2" not in first_actual, "Old combined field actual_scope1_2 should not exist"
            
            print(f"PASS: Actuals contain separate scope fields: actual_scope1={first_actual['actual_scope1']}, actual_scope2={first_actual['actual_scope2']}, actual_scope3={first_actual['actual_scope3']}")
        else:
            print("PASS: Structure verified (no actuals data yet)")
    
    def test_trajectory_returns_trajectory_points(self):
        """Test that trajectory contains proper target values"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "trajectory" in data, "Response missing 'trajectory' key"
        trajectory = data["trajectory"]
        
        if len(trajectory) > 0:
            first_point = trajectory[0]
            assert "year" in first_point, "Missing year in trajectory point"
            assert "target_scope1_2" in first_point, "Missing target_scope1_2 in trajectory"
            assert "target_scope3" in first_point, "Missing target_scope3 in trajectory"
            assert "target_total" in first_point, "Missing target_total in trajectory"
            print(f"PASS: Trajectory contains proper target values for year {first_point['year']}")
    
    def test_trajectory_returns_objective_details(self):
        """Test that trajectory includes objective details with baseline"""
        response = requests.get(f"{BASE_URL}/api/objectives/trajectory", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "objective" in data, "Response missing 'objective' key"
        objective = data.get("objective")
        
        if objective:
            assert "baseline_total" in objective, "Missing baseline_total in objective"
            assert "baseline_scope1_2" in objective, "Missing baseline_scope1_2 in objective"
            assert "baseline_scope3" in objective, "Missing baseline_scope3 in objective"
            assert "target_year" in objective, "Missing target_year in objective"
            print(f"PASS: Objective contains baseline_total={objective['baseline_total']}")
    
    def test_objectives_endpoint_returns_200(self):
        """Test that /api/objectives returns current objective"""
        response = requests.get(f"{BASE_URL}/api/objectives", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Objectives endpoint returns 200")
    
    def test_recommendations_endpoint_returns_200(self):
        """Test that /api/objectives/recommendations returns 200"""
        response = requests.get(f"{BASE_URL}/api/objectives/recommendations", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Recommendations endpoint returns 200")
    
    def test_dashboard_summary_works(self):
        """Test that dashboard summary still works"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Dashboard summary works")
    
    def test_dashboard_kpis_works(self):
        """Test that dashboard KPIs still works"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Dashboard KPIs works")

    def test_fiscal_scenarios_endpoint(self):
        """Test that fiscal scenarios endpoint works for scenario overlay"""
        response = requests.get(f"{BASE_URL}/api/fiscal-years/scenarios/2029", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Scenarios should return a list"
        print(f"PASS: Fiscal scenarios endpoint works, found {len(data)} scenarios for year 2029")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
