from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_MakeEnvelope, ST_Within
from .base import BaseRepository
from ..models.observation import SalinityObservation


class ObservationRepository(BaseRepository[SalinityObservation]):
    def __init__(self, db: Session):
        super().__init__(SalinityObservation, db)

    def get_by_upload_id(self, upload_id: UUID) -> List[SalinityObservation]:
        return (
            self.db.query(SalinityObservation)
            .filter(SalinityObservation.upload_id == upload_id)
            .all()
        )

    def get_paginated(
        self,
        page: int = 1,
        page_size: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        station_id: Optional[str] = None,
        min_lat: Optional[float] = None,
        max_lat: Optional[float] = None,
        min_lon: Optional[float] = None,
        max_lon: Optional[float] = None,
    ) -> Tuple[List[SalinityObservation], int]:
        """Get paginated observations with optional filters."""
        query = self.db.query(SalinityObservation)

        # Time filters
        if start_date:
            query = query.filter(SalinityObservation.measured_at >= start_date)
        if end_date:
            query = query.filter(SalinityObservation.measured_at <= end_date)

        # Station filter
        if station_id:
            query = query.filter(SalinityObservation.station_id == station_id)

        # Bounding box filter using PostGIS
        if all([min_lat, max_lat, min_lon, max_lon]):
            bbox = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
            query = query.filter(ST_Within(SalinityObservation.geom, bbox))

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        items = (
            query.order_by(SalinityObservation.measured_at.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )

        return items, total

    def create_batch(self, observations: List[dict], upload_id: UUID) -> int:
        """Insert multiple observations in batch."""
        count = 0
        for obs_data in observations:
            obs_data["upload_id"] = upload_id
            self.db.add(SalinityObservation(**obs_data))
            count += 1
            if count % 100 == 0:  # Commit every 100 rows
                self.db.commit()
        self.db.commit()  # Final commit
        return count

    def get_stats(self) -> dict:
        """Get aggregate statistics."""
        result = self.db.query(
            func.count(SalinityObservation.id).label("total"),
            func.min(SalinityObservation.salinity).label("min_salinity"),
            func.max(SalinityObservation.salinity).label("max_salinity"),
            func.min(SalinityObservation.measured_at).label("earliest"),
            func.max(SalinityObservation.measured_at).label("latest"),
        ).first()
        return {
            "total": result.total or 0,
            "min_salinity": float(result.min_salinity) if result.min_salinity else None,
            "max_salinity": float(result.max_salinity) if result.max_salinity else None,
            "earliest_date": result.earliest,
            "latest_date": result.latest,
        }
