"""
Authentication dependencies for FastAPI endpoints.

These dependencies can be used across all API routers to protect endpoints:
- get_current_user: Extracts and validates user from Bearer token
- get_current_active_user: Ensures user is active
- get_admin_user: Ensures user has admin role
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import oauth2_scheme, decode_token
from ..models.user import User
from ..services.auth_service import AuthService


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to extract and validate user from Bearer token.
    
    Returns the User model (not UserResponse) so endpoints can access all fields.
    
    Raises:
        HTTPException 401: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except ValueError:
        raise credentials_exception
    
    auth_service = AuthService(db)
    user = auth_service.get_current_user(user_id)
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is active.
    
    Depends on get_current_user and adds is_active check.
    
    Raises:
        HTTPException 401: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Dependency to ensure user has admin role.
    
    Depends on get_current_active_user and adds role check.
    
    Raises:
        HTTPException 403: If user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
