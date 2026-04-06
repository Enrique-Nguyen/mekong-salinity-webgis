from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import oauth2_scheme, decode_token
from ..services.auth_service import AuthService
from ..schemas.auth import UserRegister, TokenResponse
from ..schemas.user import UserResponse

router = APIRouter()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Dependency to get AuthService instance."""
    return AuthService(db)


async def get_current_user_dependency(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Dependency to get current authenticated user from token."""
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
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user.
    
    - **username**: unique username
    - **email**: valid email address
    - **password**: user password
    """
    user = auth_service.register_user(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password
    )
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate user and return access token.
    
    Uses OAuth2 password flow with form data:
    - **username**: user's username
    - **password**: user's password
    """
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_service.create_user_token(user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user_dependency)):
    """
    Get current authenticated user information.
    
    Requires valid Bearer token in Authorization header.
    """
    return current_user
