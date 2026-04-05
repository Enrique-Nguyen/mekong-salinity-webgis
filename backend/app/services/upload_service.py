from typing import Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException, status

from .file_service import get_file_service
from .validation_service import validate_file_type, validate_file_size, ValidationResult
from ..repositories.upload_repository import UploadRepository
from ..models.upload import Upload


class UploadService:
    def __init__(self, db: Session):
        self.db = db
        self.upload_repo = UploadRepository(db)
        self.file_service = get_file_service()
    
    async def process_upload(
        self, 
        file: UploadFile, 
        user_id: UUID
    ) -> Tuple[Upload, ValidationResult]:
        """Process a file upload."""
        from .validation_service import ValidationResult
        
        # Validate file type
        is_valid_type, file_type_or_error = validate_file_type(file.filename)
        if not is_valid_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=file_type_or_error
            )
        
        # Get file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        # Validate file size
        is_valid_size, size_error = validate_file_size(file_size)
        if not is_valid_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=size_error
            )
        
        # Save file
        file_path = await self.file_service.save_file(file, category="raw")
        
        # Create upload record
        upload = self.upload_repo.create({
            "user_id": user_id,
            "file_name": file.filename,
            "file_type": file_type_or_error,
            "file_path": file_path,
            "status": "pending"
        })
        
        # Return upload record (validation happens in parser_service)
        result = ValidationResult()
        return upload, result
    
    def update_upload_status(
        self, 
        upload_id: UUID, 
        status: str,
        total_rows: int = 0,
        valid_rows: int = 0,
        invalid_rows: int = 0
    ) -> Upload:
        """Update upload status after processing."""
        return self.upload_repo.update_status(
            upload_id, status, total_rows, valid_rows, invalid_rows
        )
    
    def get_user_uploads(self, user_id: UUID, skip: int = 0, limit: int = 100):
        """Get uploads for a specific user."""
        return self.upload_repo.get_by_user_id(user_id, skip, limit)


def get_upload_service(db: Session) -> UploadService:
    return UploadService(db)
