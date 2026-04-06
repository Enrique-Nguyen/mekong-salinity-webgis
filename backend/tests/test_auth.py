"""
Tests for authentication endpoints.

Tests cover:
- User registration (success, duplicate username, duplicate email, invalid email)
- User login (success, wrong username, wrong password)
- Protected endpoint /auth/me (with/without token)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestRegister:
    """Tests for POST /auth/register endpoint."""

    def test_register_success(self, client: TestClient, db: Session):
        """Test registering a new user with valid data returns 201."""
        response = client.post(
            "/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "securepassword123"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert data["role"] == "user"
        assert "id" in data
        # Password should not be returned
        assert "password" not in data
        assert "hashed_password" not in data

    def test_register_duplicate_username(self, client: TestClient, test_user):
        """Test registering with existing username returns 400."""
        response = client.post(
            "/auth/register",
            json={
                "username": "testuser",  # Same as test_user fixture
                "email": "different@example.com",
                "password": "password123"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Check error message mentions username
        assert "username" in data["detail"].lower() or "exists" in data["detail"].lower()

    def test_register_duplicate_email(self, client: TestClient, test_user):
        """Test registering with existing email returns 400."""
        response = client.post(
            "/auth/register",
            json={
                "username": "differentuser",
                "email": "testuser@example.com",  # Same as test_user fixture
                "password": "password123"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # Check error message mentions email
        assert "email" in data["detail"].lower() or "exists" in data["detail"].lower()

    def test_register_invalid_email_format(self, client: TestClient, db: Session):
        """Test registering with invalid email format returns 422."""
        response = client.post(
            "/auth/register",
            json={
                "username": "newuser",
                "email": "not-a-valid-email",
                "password": "password123"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data


class TestLogin:
    """Tests for POST /auth/login endpoint."""

    def test_login_success(self, client: TestClient, test_user):
        """Test login with valid credentials returns access token."""
        response = client.post(
            "/auth/login",
            data={  # Form data, not JSON
                "username": "testuser",
                "password": "testpassword123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_invalid_username(self, client: TestClient, test_user):
        """Test login with non-existent username returns 401."""
        response = client.post(
            "/auth/login",
            data={
                "username": "nonexistent",
                "password": "testpassword123"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower() or "invalid" in data["detail"].lower()

    def test_login_invalid_password(self, client: TestClient, test_user):
        """Test login with wrong password returns 401."""
        response = client.post(
            "/auth/login",
            data={
                "username": "testuser",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower() or "invalid" in data["detail"].lower()

    def test_login_with_json_fails(self, client: TestClient, test_user):
        """Test that login with JSON body fails (expects form data)."""
        response = client.post(
            "/auth/login",
            json={  # JSON instead of form data
                "username": "testuser",
                "password": "testpassword123"
            }
        )
        
        # Should fail validation since OAuth2PasswordRequestForm expects form data
        assert response.status_code == 422


class TestGetMe:
    """Tests for GET /auth/me endpoint."""

    def test_get_me_without_token(self, client: TestClient, db: Session):
        """Test accessing /auth/me without token returns 401."""
        response = client.get("/auth/me")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_get_me_with_valid_token(self, client: TestClient, test_user, auth_headers):
        """Test accessing /auth/me with valid token returns user info."""
        response = client.get("/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "testuser@example.com"
        assert data["role"] == "user"
        assert "id" in data
        # Password should not be returned
        assert "password" not in data
        assert "hashed_password" not in data

    def test_get_me_with_invalid_token(self, client: TestClient, db: Session):
        """Test accessing /auth/me with invalid token returns 401."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_get_me_with_malformed_header(self, client: TestClient, db: Session):
        """Test accessing /auth/me with malformed auth header returns 401."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "NotBearer sometoken"}
        )
        
        assert response.status_code == 401

    def test_get_me_admin_user(self, client: TestClient, admin_user, admin_auth_headers):
        """Test accessing /auth/me as admin returns admin user info."""
        response = client.get("/auth/me", headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["email"] == "admin@example.com"
        assert data["role"] == "admin"
