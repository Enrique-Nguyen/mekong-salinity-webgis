from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from pydantic import BaseModel
from math import ceil

from ..core.database import get_db
from ..repositories.observation_repository import ObservationRepository
from ..schemas.observation import ObservationResponse
from ..models.user import User
from .deps import get_current_active_user


router = APIRouter()

# Pagination constants
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 5000


# Generic paginated response schema
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ObservationStatsResponse(BaseModel):
    total: int
    min_salinity: Optional[float]
    max_salinity: Optional[float]
    earliest_date: Optional[datetime]
    latest_date: Optional[datetime]


@router.get("", response_model=PaginatedResponse[ObservationResponse])
def get_observations(
    start_date: Optional[datetime] = Query(None, description="Filter observations from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter observations until this date"),
    min_lat: Optional[float] = Query(None, ge=-90, le=90, description="Minimum latitude for bounding box"),
    max_lat: Optional[float] = Query(None, ge=-90, le=90, description="Maximum latitude for bounding box"),
    min_lon: Optional[float] = Query(None, ge=-180, le=180, description="Minimum longitude for bounding box"),
    max_lon: Optional[float] = Query(None, ge=-180, le=180, description="Maximum longitude for bounding box"),
    station_id: Optional[str] = Query(None, description="Filter by station ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page (max 5000)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get paginated observations with optional filters.
    
    Requires authentication.
    
    Supports filtering by:
    - Time range (start_date, end_date)
    - Bounding box (min_lat, max_lat, min_lon, max_lon) - all four required for bbox filter
    - Station ID
    """
    repo = ObservationRepository(db)
    
    items, total = repo.get_paginated(
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        station_id=station_id,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
    )
    
    total_pages = ceil(total / page_size) if total > 0 else 0
    
    return PaginatedResponse(
        items=[ObservationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=ObservationStatsResponse)
def get_observation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get aggregate statistics for all observations.
    
    Requires authentication.
    
    Returns:
    - total: Total number of observations
    - min_salinity: Minimum salinity value
    - max_salinity: Maximum salinity value
    - earliest_date: Earliest observation date
    - latest_date: Latest observation date
    """
    repo = ObservationRepository(db)
    stats = repo.get_stats()
    
    return ObservationStatsResponse(
        total=stats["total"],
        min_salinity=stats["min_salinity"],
        max_salinity=stats["max_salinity"],
        earliest_date=stats["earliest_date"],
        latest_date=stats["latest_date"],
    )
