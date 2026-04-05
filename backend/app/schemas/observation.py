from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class ObservationCreate(BaseModel):
    station_id: str
    station_name: Optional[str] = None
    measured_at: datetime
    salinity: float
    ph: Optional[float] = None
    dissolved_oxygen: Optional[float] = None
    temperature: Optional[float] = None
    latitude: float
    longitude: float


class ObservationResponse(BaseModel):
    id: UUID
    upload_id: UUID
    station_id: str
    station_name: Optional[str]
    measured_at: datetime
    salinity: float
    ph: Optional[float]
    dissolved_oxygen: Optional[float]
    temperature: Optional[float]
    latitude: float
    longitude: float

    class Config:
        from_attributes = True
