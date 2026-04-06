"""
Pytest configuration and fixtures for backend tests.

Provides:
- Test database session with SQLite
- FastAPI TestClient
- Test user fixtures (regular + admin)
- Authentication token fixtures

Note: Uses SQLite for tests, which doesn't support PostGIS.
Geospatial queries (bbox filters) are mocked or skipped.
"""

import pytest
from typing import Generator
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import UUID
import uuid as uuid_module

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.upload import Upload
from app.core.security import hash_password, create_access_token


# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Create a test-compatible observation model without PostGIS
class TestSalinityObservation(Base):
    """Simplified observation model for SQLite testing (no PostGIS)."""
    __tablename__ = "salinity_observations"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    upload_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uploads.id", ondelete="CASCADE"),
        nullable=False,
    )
    station_id = Column(String(50), nullable=False, index=True)
    station_name = Column(String(255))
    measured_at = Column(DateTime(timezone=True), nullable=False, index=True)
    salinity = Column(Numeric(6, 2), nullable=False)
    ph = Column(Numeric(4, 2))
    dissolved_oxygen = Column(Numeric(5, 2))
    temperature = Column(Numeric(4, 1))
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    # Omit geom column for SQLite testing


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database session override."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Mock the PostGIS functions for SQLite compatibility
    with patch("app.repositories.observation_repository.ST_MakeEnvelope") as mock_envelope, \
         patch("app.repositories.observation_repository.ST_Within") as mock_within:
        mock_within.return_value = True  # Always return True for bbox filter
        with TestClient(app) as test_client:
            yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> User:
    """Create a regular test user."""
    user = User(
        id=uuid_module.uuid4(),
        username="testuser",
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session) -> User:
    """Create an admin test user."""
    user = User(
        id=uuid_module.uuid4(),
        username="admin",
        email="admin@example.com",
        hashed_password=hash_password("admin123"),
        role="admin",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user_token(test_user: User) -> str:
    """Create access token for test user."""
    return create_access_token(data={"sub": str(test_user.id)})


@pytest.fixture
def admin_user_token(admin_user: User) -> str:
    """Create access token for admin user."""
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def auth_headers(test_user_token: str) -> dict:
    """Authorization headers for test user."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest.fixture
def admin_auth_headers(admin_user_token: str) -> dict:
    """Authorization headers for admin user."""
    return {"Authorization": f"Bearer {admin_user_token}"}


@pytest.fixture
def sample_upload(db: Session, test_user: User) -> Upload:
    """Create a sample upload record."""
    upload = Upload(
        id=uuid_module.uuid4(),
        user_id=test_user.id,
        file_name="test_upload.csv",
        file_type="csv",
        file_path="/uploads/raw/test_upload.csv",
        status="completed",
        total_rows=10,
        valid_rows=10,
        invalid_rows=0
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


@pytest.fixture
def sample_observations(db: Session, sample_upload: Upload) -> list:
    """Create sample salinity observations for testing."""
    from datetime import datetime, timezone, timedelta
    
    observations = []
    base_date = datetime(2024, 3, 15, 8, 0, 0, tzinfo=timezone.utc)
    
    # Create 20 observations across different stations and dates
    stations = [
        ("BT_001", "Trạm BT_001 - Bến Tre", 10.24, 106.38),
        ("BT_002", "Trạm BT_002 - Bến Tre", 10.26, 106.40),
        ("TV_001", "Trạm TV_001 - Trà Vinh", 9.94, 106.34),
        ("ST_001", "Trạm ST_001 - Sóc Trăng", 9.60, 105.97),
    ]
    
    for i in range(20):
        station = stations[i % len(stations)]
        obs = TestSalinityObservation(
            id=uuid_module.uuid4(),
            upload_id=sample_upload.id,
            station_id=station[0],
            station_name=station[1],
            measured_at=base_date + timedelta(days=i, hours=i % 8),
            salinity=10.0 + (i % 15),
            ph=7.0 + (i % 10) * 0.1,
            dissolved_oxygen=5.5 + (i % 5) * 0.3,
            temperature=27.0 + (i % 5),
            latitude=station[2],
            longitude=station[3]
        )
        db.add(obs)
        observations.append(obs)
    
    db.commit()
    return observations
