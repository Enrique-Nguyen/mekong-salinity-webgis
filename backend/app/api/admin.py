"""
Admin API endpoints for user management, upload management, and data management.

All endpoints require admin role authentication.
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.upload import Upload
from ..schemas.user import UserResponse
from ..schemas.admin import (
    UserListResponse,
    UserUpdateRequest,
    UploadListResponse,
    UploadAdminResponse,
    AdminStatsResponse,
    FileFormatGuideResponse,
    ColumnInfo,
)
from ..repositories.user_repository import UserRepository
from ..repositories.upload_repository import UploadRepository
from ..repositories.observation_repository import ObservationRepository
from .deps import get_admin_user

router = APIRouter()


# ============== USER MANAGEMENT ==============

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    List all users with pagination and filtering.
    Admin only.
    """
    user_repo = UserRepository(db)
    
    # Build query with filters
    query = db.query(User)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) | 
            (User.email.ilike(search_pattern))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Get a specific user by ID.
    Admin only.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Update user details (role, active status).
    Admin only.
    
    Cannot demote yourself or deactivate yourself.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-demotion or self-deactivation
    if user.id == admin.id:
        if update_data.role and update_data.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote yourself"
            )
        if update_data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate yourself"
            )
    
    # Build update dict
    update_dict = {}
    if update_data.role is not None:
        if update_data.role not in ["user", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be 'user' or 'admin'"
            )
        update_dict["role"] = update_data.role
    
    if update_data.is_active is not None:
        update_dict["is_active"] = update_data.is_active
    
    if update_dict:
        updated_user = user_repo.update(user_id, update_dict)
        return UserResponse.model_validate(updated_user)
    
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Delete a user and all their data.
    Admin only.
    
    Cannot delete yourself.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Delete user (cascades to uploads and observations)
    success = user_repo.delete(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )
    
    return {"message": "User deleted successfully", "user_id": str(user_id)}


# ============== UPLOAD MANAGEMENT ==============

@router.get("/uploads", response_model=UploadListResponse)
async def list_all_uploads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    List all uploads with pagination and filtering.
    Admin only - can see all users' uploads.
    """
    query = db.query(Upload)
    
    if status_filter:
        query = query.filter(Upload.status == status_filter)
    
    if user_id:
        query = query.filter(Upload.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination with user join for username display
    offset = (page - 1) * page_size
    uploads = query.order_by(Upload.uploaded_at.desc()).offset(offset).limit(page_size).all()
    
    # Build response with user info
    uploads_response = []
    for upload in uploads:
        user = db.query(User).filter(User.id == upload.user_id).first()
        uploads_response.append(UploadAdminResponse(
            id=upload.id,
            user_id=upload.user_id,
            username=user.username if user else "Unknown",
            file_name=upload.file_name,
            file_type=upload.file_type,
            uploaded_at=upload.uploaded_at,
            status=upload.status,
            total_rows=upload.total_rows,
            valid_rows=upload.valid_rows,
            invalid_rows=upload.invalid_rows,
        ))
    
    return UploadListResponse(
        uploads=uploads_response,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Delete an upload and all its observations.
    Admin only.
    """
    upload_repo = UploadRepository(db)
    upload = upload_repo.get_by_id(upload_id)
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    # Delete upload (cascades to observations)
    success = upload_repo.delete(upload_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete upload"
        )
    
    return {
        "message": "Upload deleted successfully",
        "upload_id": str(upload_id),
        "deleted_observations": upload.valid_rows
    }


# ============== OBSERVATION MANAGEMENT ==============

@router.delete("/observations/{observation_id}")
async def delete_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Delete a single observation.
    Admin only.
    """
    obs_repo = ObservationRepository(db)
    observation = obs_repo.get_by_id(observation_id)
    
    if not observation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation not found"
        )
    
    success = obs_repo.delete(observation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete observation"
        )
    
    return {"message": "Observation deleted successfully", "observation_id": str(observation_id)}


@router.delete("/observations/by-upload/{upload_id}")
async def delete_observations_by_upload(
    upload_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Delete all observations from a specific upload.
    Admin only.
    """
    from ..models.observation import SalinityObservation
    
    # Check if upload exists
    upload_repo = UploadRepository(db)
    upload = upload_repo.get_by_id(upload_id)
    
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    # Delete all observations for this upload
    deleted_count = db.query(SalinityObservation).filter(
        SalinityObservation.upload_id == upload_id
    ).delete()
    db.commit()
    
    # Update upload stats
    upload_repo.update(upload_id, {
        "valid_rows": 0,
        "status": "cleared"
    })
    
    return {
        "message": "Observations deleted successfully",
        "upload_id": str(upload_id),
        "deleted_count": deleted_count
    }


# ============== ADMIN STATISTICS ==============

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """
    Get system-wide statistics for admin dashboard.
    Admin only.
    """
    from ..models.observation import SalinityObservation
    
    # User stats
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    
    # Upload stats
    total_uploads = db.query(Upload).count()
    pending_uploads = db.query(Upload).filter(Upload.status == "pending").count()
    completed_uploads = db.query(Upload).filter(Upload.status == "completed").count()
    failed_uploads = db.query(Upload).filter(Upload.status == "failed").count()
    
    # Observation stats
    obs_repo = ObservationRepository(db)
    obs_stats = obs_repo.get_stats()
    
    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_uploads=total_uploads,
        pending_uploads=pending_uploads,
        completed_uploads=completed_uploads,
        failed_uploads=failed_uploads,
        total_observations=obs_stats["total"],
        min_salinity=obs_stats["min_salinity"],
        max_salinity=obs_stats["max_salinity"],
        earliest_date=obs_stats["earliest_date"],
        latest_date=obs_stats["latest_date"],
    )


# ============== FILE FORMAT GUIDE ==============

@router.get("/file-format-guide", response_model=FileFormatGuideResponse)
async def get_file_format_guide():
    """
    Get detailed file format requirements for data upload.
    Public endpoint - no auth required for documentation access.
    """
    required_columns = [
        ColumnInfo(
            name="timestamp",
            data_type="datetime",
            required=True,
            description="Thời điểm quan trắc. Khuyến nghị dùng định dạng ISO 8601 (VD: 2024-01-15T10:30:00Z)",
            aliases=["time", "datetime", "date_time", "measured_at"],
            example="2024-01-15T10:30:00Z"
        ),
        ColumnInfo(
            name="latitude",
            data_type="float",
            required=True,
            description="Vĩ độ của điểm đo. Phạm vi ĐBSCL: 8.5 - 11.5",
            aliases=["lat"],
            example="10.245",
            validation="Cảnh báo nếu ngoài phạm vi ĐBSCL"
        ),
        ColumnInfo(
            name="longitude",
            data_type="float",
            required=True,
            description="Kinh độ của điểm đo. Phạm vi ĐBSCL: 103.5 - 107.5",
            aliases=["lon", "lng"],
            example="106.382",
            validation="Cảnh báo nếu ngoài phạm vi ĐBSCL"
        ),
        ColumnInfo(
            name="salinity",
            data_type="float",
            required=True,
            description="Giá trị độ mặn (g/L hoặc ppt). Không được âm.",
            aliases=[],
            example="15.5",
            validation="Phải >= 0"
        ),
    ]
    
    optional_columns = [
        ColumnInfo(
            name="station_id",
            data_type="string",
            required=False,
            description="Mã trạm quan trắc. Nếu không có, hệ thống sẽ tự sinh từ tọa độ.",
            aliases=["stationid", "station"],
            example="BT_001"
        ),
        ColumnInfo(
            name="station_name",
            data_type="string",
            required=False,
            description="Tên đầy đủ của trạm quan trắc.",
            aliases=["stationname", "name"],
            example="Trạm Bến Tre 001"
        ),
        ColumnInfo(
            name="ph",
            data_type="float",
            required=False,
            description="Độ pH của nước.",
            aliases=[],
            example="7.2",
            validation="Cảnh báo nếu ngoài khoảng 0-14"
        ),
        ColumnInfo(
            name="dissolved_oxygen",
            data_type="float",
            required=False,
            description="Hàm lượng oxy hòa tan (mg/L).",
            aliases=["dissolvedoxygen", "do", "DO"],
            example="6.5",
            validation="Phải >= 0"
        ),
        ColumnInfo(
            name="temperature",
            data_type="float",
            required=False,
            description="Nhiệt độ nước (°C).",
            aliases=["temp"],
            example="28.5",
            validation="Cảnh báo nếu ngoài khoảng -10 đến 50"
        ),
    ]
    
    sample_csv = """timestamp,latitude,longitude,salinity,station_id,station_name,ph,dissolved_oxygen,temperature
2024-01-15T10:30:00Z,10.245,106.382,15.5,BT_001,Trạm Bến Tre 001,7.2,6.5,28.5
2024-01-15T11:00:00Z,10.312,106.425,12.3,BT_002,Trạm Bến Tre 002,7.4,6.8,29.0
2024-01-15T11:30:00Z,9.985,106.218,18.7,TV_001,Trạm Trà Vinh 001,7.1,6.2,28.0"""
    
    sample_minimal = """timestamp,latitude,longitude,salinity
2024-01-15T10:30:00Z,10.245,106.382,15.5
2024-01-15T11:00:00Z,10.312,106.425,12.3"""
    
    return FileFormatGuideResponse(
        accepted_formats=["CSV (.csv)", "Excel (.xlsx, .xls)"],
        max_file_size_mb=10,
        encoding="UTF-8 (khuyến nghị cho CSV)",
        required_columns=required_columns,
        optional_columns=optional_columns,
        sample_csv_full=sample_csv,
        sample_csv_minimal=sample_minimal,
        notes=[
            "Hệ thống tự động nhận diện các tên cột thay thế (aliases)",
            "Dữ liệu ngoài phạm vi ĐBSCL vẫn được chấp nhận nhưng có cảnh báo",
            "File Excel: hệ thống chỉ đọc sheet đầu tiên",
            "Dòng đầu tiên phải là header chứa tên cột",
            "Timestamp hỗ trợ nhiều định dạng: ISO 8601, DD/MM/YYYY HH:MM, YYYY-MM-DD, v.v.",
        ]
    )
