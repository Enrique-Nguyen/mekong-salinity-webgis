from datetime import timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..core.security import hash_password, verify_password, create_access_token
from ..core.config import settings
from ..models.user import User
from ..repositories.user_repository import UserRepository
from ..schemas.auth import TokenResponse


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
    
    def register_user(self, username: str, email: str, password: str) -> User:
        """Register a new user."""
        # Check if username exists
        if self.user_repo.get_by_username(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email exists
        if self.user_repo.get_by_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password and create user
        hashed = hash_password(password)
        return self.user_repo.create_user(username, email, hashed)
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user by username and password."""
        user = self.user_repo.get_by_username(username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user
    
    def create_user_token(self, user: User) -> TokenResponse:
        """Create JWT access token for user."""
        expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role},
            expires_delta=expires
        )
        return TokenResponse(access_token=token)
    
    def get_current_user(self, user_id: str) -> Optional[User]:
        """Get user by ID (extracted from token)."""
        from uuid import UUID
        try:
            uuid_id = UUID(user_id)
            return self.user_repo.get_by_id(uuid_id)
        except ValueError:
            return None


# Convenience functions for dependency injection
def get_auth_service(db: Session) -> AuthService:
    return AuthService(db)
