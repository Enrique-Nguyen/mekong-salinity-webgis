from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class UploadCreate(BaseModel):
    file_name: str
    file_type: str


class UploadResponse(BaseModel):
    id: UUID
    user_id: UUID
    file_name: str
    file_type: str
    uploaded_at: datetime
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int

    class Config:
        from_attributes = True
