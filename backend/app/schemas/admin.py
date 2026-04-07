"""
Admin-specific Pydantic schemas for API request/response models.
"""

from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from .user import UserResponse


# ============== USER MANAGEMENT ==============

class UserUpdateRequest(BaseModel):
    """Request schema for updating user details."""
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    """Response schema for paginated user list."""
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============== UPLOAD MANAGEMENT ==============

class UploadAdminResponse(BaseModel):
    """Response schema for upload with user info (admin view)."""
    id: UUID
    user_id: UUID
    username: str
    file_name: str
    file_type: str
    uploaded_at: datetime
    status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int

    class Config:
        from_attributes = True


class UploadListResponse(BaseModel):
    """Response schema for paginated upload list."""
    uploads: List[UploadAdminResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============== ADMIN STATISTICS ==============

class AdminStatsResponse(BaseModel):
    """Response schema for admin dashboard statistics."""
    # User stats
    total_users: int
    active_users: int
    admin_users: int
    
    # Upload stats
    total_uploads: int
    pending_uploads: int
    completed_uploads: int
    failed_uploads: int
    
    # Observation stats
    total_observations: int
    min_salinity: Optional[float]
    max_salinity: Optional[float]
    earliest_date: Optional[datetime]
    latest_date: Optional[datetime]


# ============== FILE FORMAT GUIDE ==============

class ColumnInfo(BaseModel):
    """Schema for column information in file format guide."""
    name: str
    data_type: str
    required: bool
    description: str
    aliases: List[str] = []
    example: str = ""
    validation: Optional[str] = None


class FileFormatGuideResponse(BaseModel):
    """Response schema for file format documentation."""
    accepted_formats: List[str]
    max_file_size_mb: int
    encoding: str
    required_columns: List[ColumnInfo]
    optional_columns: List[ColumnInfo]
    sample_csv_full: str
    sample_csv_minimal: str
    notes: List[str]
