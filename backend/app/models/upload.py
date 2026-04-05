import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # 'csv' or 'xlsx'
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(
        String(20), default="pending"
    )  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)

    user = relationship("User", backref="uploads")
