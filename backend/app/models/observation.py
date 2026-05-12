import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from sqlalchemy.orm import relationship, backref
from ..core.database import Base


class SalinityObservation(Base):
    __tablename__ = "salinity_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    geom = Column(Geometry(geometry_type="POINT", srid=4326))

    upload = relationship("Upload", backref=backref("observations", cascade="all, delete-orphan"))
