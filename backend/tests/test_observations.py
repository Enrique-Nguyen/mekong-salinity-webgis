"""
Tests for observations query endpoint.

Tests:
- Query with filters (bbox, time range)
- Pagination (page, page_size)
- Stats endpoint
- Authentication required
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient


class TestObservationsAuthentication:
    """Tests for observations endpoint authentication."""
    
    def test_observations_requires_authentication(self, client: TestClient):
        """Test observations endpoint requires authentication."""
        response = client.get("/api/observations")
        
        assert response.status_code == 401
        assert "detail" in response.json()
    
    def test_observations_stats_requires_authentication(self, client: TestClient):
        """Test observations stats endpoint requires authentication."""
        response = client.get("/api/observations/stats")
        
        assert response.status_code == 401


class TestObservationsPagination:
    """Tests for observations pagination."""
    
    def test_observations_default_pagination(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test observations returns paginated response."""
        response = client.get("/api/observations", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check pagination structure
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        
        # Check defaults
        assert data["page"] == 1
        assert data["page_size"] == 100  # Default page size
    
    def test_observations_custom_page_size(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test observations with custom page size."""
        response = client.get("/api/observations?page_size=5", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page_size"] == 5
        assert len(data["items"]) <= 5
    
    def test_observations_page_navigation(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test observations page navigation."""
        # Get first page with small page size
        response1 = client.get("/api/observations?page=1&page_size=5", headers=auth_headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = client.get("/api/observations?page=2&page_size=5", headers=auth_headers)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Check pagination info
        assert data1["page"] == 1
        assert data2["page"] == 2
        
        # Items should be different between pages (if we have enough data)
        if len(data1["items"]) > 0 and len(data2["items"]) > 0:
            assert data1["items"][0]["id"] != data2["items"][0]["id"]
    
    def test_observations_invalid_page(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test observations with invalid page number."""
        response = client.get("/api/observations?page=0", headers=auth_headers)
        
        # FastAPI should reject page < 1
        assert response.status_code == 422
    
    def test_observations_page_size_limit(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test observations page size max limit."""
        # Request page size above max (5000)
        response = client.get("/api/observations?page_size=10000", headers=auth_headers)
        
        # Should reject or cap the page size
        assert response.status_code == 422  # Validation error


class TestObservationsFilters:
    """Tests for observations filters."""
    
    def test_observations_filter_by_bbox(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test filtering observations by bounding box.
        
        Note: In test environment with SQLite, PostGIS bbox filter is not available.
        This test verifies the API accepts bbox parameters correctly.
        """
        # Filter to Bến Tre area (around 10.24, 106.38)
        params = "min_lat=10.0&max_lat=10.5&min_lon=106.0&max_lon=107.0"
        response = client.get(f"/api/observations?{params}", headers=auth_headers)
        
        # Should not error (200 or filtered results)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_observations_filter_by_bbox_empty_result(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test bbox filter with area outside our test data.
        
        Note: In test environment with SQLite, PostGIS bbox filter is not available.
        This test verifies the API accepts bbox parameters correctly.
        """
        # Filter to area outside our test data
        params = "min_lat=0.0&max_lat=1.0&min_lon=0.0&max_lon=1.0"
        response = client.get(f"/api/observations?{params}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_observations_filter_by_time_range(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test filtering observations by time range."""
        # Filter to March 2024
        params = "start_date=2024-03-01T00:00:00Z&end_date=2024-03-31T23:59:59Z"
        response = client.get(f"/api/observations?{params}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check dates are within range for returned items
        for item in data["items"]:
            measured_at = datetime.fromisoformat(item["measured_at"].replace("Z", "+00:00"))
            assert measured_at.month == 3 or measured_at >= datetime(2024, 3, 1, tzinfo=timezone.utc)
    
    def test_observations_filter_by_start_date_only(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test filtering observations by start date only."""
        params = "start_date=2024-03-20T00:00:00Z"
        response = client.get(f"/api/observations?{params}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All items should be after start date
        for item in data["items"]:
            measured_at = datetime.fromisoformat(item["measured_at"].replace("Z", "+00:00"))
            assert measured_at >= datetime(2024, 3, 20, tzinfo=timezone.utc)
    
    def test_observations_filter_by_station_id(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test filtering observations by station ID."""
        response = client.get("/api/observations?station_id=BT_001", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All items should have matching station_id
        for item in data["items"]:
            assert item["station_id"] == "BT_001"
    
    def test_observations_combined_filters(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test combining multiple filters.
        
        Note: In test environment, bbox filter may not work with SQLite.
        This test verifies the API accepts combined filter parameters correctly.
        """
        # Combine time range + station
        params = (
            "start_date=2024-03-01T00:00:00Z"
            "&station_id=BT_001"
        )
        response = client.get(f"/api/observations?{params}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All items should satisfy non-PostGIS filters
        for item in data["items"]:
            assert item["station_id"] == "BT_001"


class TestObservationsStats:
    """Tests for observations statistics endpoint."""
    
    def test_observations_stats(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test getting observation statistics."""
        response = client.get("/api/observations/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check stats structure
        assert "total" in data
        assert "min_salinity" in data
        assert "max_salinity" in data
        assert "earliest_date" in data
        assert "latest_date" in data
        
        # Check values are sensible
        assert data["total"] == 20  # We created 20 observations
        assert data["min_salinity"] is not None
        assert data["max_salinity"] is not None
        assert data["min_salinity"] <= data["max_salinity"]
    
    def test_observations_stats_empty(self, client: TestClient, auth_headers: dict, db, test_user):
        """Test getting stats when no observations exist."""
        response = client.get("/api/observations/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 0


class TestObservationsResponse:
    """Tests for observations response format."""
    
    def test_observation_response_structure(self, client: TestClient, auth_headers: dict, sample_observations):
        """Test individual observation response structure."""
        response = client.get("/api/observations", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 0:
            obs = data["items"][0]
            
            # Check required fields
            assert "id" in obs
            assert "station_id" in obs
            assert "measured_at" in obs
            assert "salinity" in obs
            assert "latitude" in obs
            assert "longitude" in obs
            
            # Check optional fields
            assert "station_name" in obs
            assert "ph" in obs
            assert "dissolved_oxygen" in obs
            assert "temperature" in obs
            
            # Check value types
            assert isinstance(obs["salinity"], (int, float))
            assert isinstance(obs["latitude"], (int, float))
            assert isinstance(obs["longitude"], (int, float))
