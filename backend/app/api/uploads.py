from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Generic, TypeVar, Optional
from pydantic import BaseModel
from math import ceil

from ..core.database import get_db
from ..models.upload import Upload
from ..models.user import User
from ..schemas.upload import UploadResponse
from .deps import get_current_active_user
from ..services.upload_service import UploadService
from ..services.parser_service import ParserService


router = APIRouter()

# Pagination constants
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 5000

# Base path for file storage (must match file_service.py)
FILE_STORAGE_BASE = "/app"


# Generic paginated response schema
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class UploadResultResponse(BaseModel):
    """Response for upload endpoint."""
    upload: UploadResponse
    total_rows: int
    valid_rows: int
    invalid_rows: int
    inserted_rows: int
    errors: List[dict]
    warnings: List[dict]
    success: bool


@router.post("", response_model=UploadResultResponse, status_code=status.HTTP_201_CREATED)
async def create_upload(
    file: UploadFile = File(..., description="CSV or XLSX file to upload"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a CSV or XLSX file containing salinity observations.
    
    Requires authentication. The file will be:
    1. Validated for type and size
    2. Saved to storage
    3. Parsed and observations inserted into database
    
    Returns:
    - upload: The upload record
    - total_rows, valid_rows, invalid_rows: Row counts
    - inserted_rows: Number of observations inserted
    - errors/warnings: Any issues found during parsing
    - success: Whether any observations were inserted
    """
    # Process upload (validates, saves file, creates record)
    upload_service = UploadService(db)
    upload, validation_result = await upload_service.process_upload(file, current_user.id)
    
    # Parse the file and insert observations
    parser_service = ParserService(db)
    
    # Convert stored path (/uploads/raw/...) to actual path (/app/uploads/raw/...)
    actual_file_path = FILE_STORAGE_BASE + upload.file_path
    
    parse_result = parser_service.parse_file(
        file_path=actual_file_path,
        file_type=upload.file_type,
        upload_id=upload.id
    )
    
    # Update upload status based on parsing result
    new_status = "completed" if parse_result.success else "failed"
    if parse_result.valid_rows > 0 and parse_result.invalid_rows > 0:
        new_status = "partial"
    
    upload = upload_service.update_upload_status(
        upload_id=upload.id,
        status=new_status,
        total_rows=parse_result.total_rows,
        valid_rows=parse_result.valid_rows,
        invalid_rows=parse_result.invalid_rows
    )
    
    return UploadResultResponse(
        upload=UploadResponse.model_validate(upload),
        total_rows=parse_result.total_rows,
        valid_rows=parse_result.valid_rows,
        invalid_rows=parse_result.invalid_rows,
        inserted_rows=parse_result.inserted_rows,
        errors=parse_result.errors,
        warnings=parse_result.warnings,
        success=parse_result.success
    )


@router.get("", response_model=PaginatedResponse[UploadResponse])
def get_uploads(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page (max 5000)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get paginated list of uploads.
    
    Requires authentication.
    - Admin users: see all uploads
    - Regular users: see only their own uploads
    
    Returns upload metadata including:
    - id: Upload UUID
    - file_name: Original filename
    - uploaded_at: Upload timestamp
    - status: Processing status
    - total_rows, valid_rows, invalid_rows: Row counts
    """
    # Build base query - admin sees all, users see own
    query = db.query(Upload)
    count_query = db.query(func.count(Upload.id))
    
    if current_user.role != "admin":
        query = query.filter(Upload.user_id == current_user.id)
        count_query = count_query.filter(Upload.user_id == current_user.id)
    
    # Get total count
    total = count_query.scalar() or 0
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get paginated items
    items = (
        query
        .order_by(Upload.uploaded_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    total_pages = ceil(total / page_size) if total > 0 else 0
    
    return PaginatedResponse(
        items=[UploadResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
