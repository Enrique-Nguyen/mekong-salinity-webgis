import os
import uuid
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional
from fastapi import UploadFile

from ..core.config import settings


class FileService(ABC):
    """Abstract base class for file storage operations."""
    
    @abstractmethod
    async def save_file(self, file: UploadFile, category: str = "raw") -> str:
        """Save a file and return the file path."""
        pass
    
    @abstractmethod
    async def get_file(self, file_path: str) -> Optional[bytes]:
        """Get file content by path."""
        pass
    
    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file by path. Returns True if successful."""
        pass
    
    @abstractmethod
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        pass


class LocalFileService(FileService):
    """Local file system storage implementation."""
    
    def __init__(self, base_path: str = "/app/uploads"):
        self.base_path = Path(base_path)
        # Ensure directories exist
        (self.base_path / "raw").mkdir(parents=True, exist_ok=True)
        (self.base_path / "processed").mkdir(parents=True, exist_ok=True)
    
    async def save_file(self, file: UploadFile, category: str = "raw") -> str:
        """Save uploaded file to local storage."""
        # Generate unique filename
        file_ext = Path(file.filename).suffix
        unique_name = f"{uuid.uuid4()}{file_ext}"
        
        # Build full path
        save_dir = self.base_path / category
        save_dir.mkdir(parents=True, exist_ok=True)
        file_path = save_dir / unique_name
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return relative path for storage in DB
        return f"/uploads/{category}/{unique_name}"
    
    async def get_file(self, file_path: str) -> Optional[bytes]:
        """Read file from local storage."""
        # Convert stored path to actual path
        actual_path = self.base_path.parent / file_path.lstrip("/")
        if actual_path.exists():
            return actual_path.read_bytes()
        return None
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from local storage."""
        actual_path = self.base_path.parent / file_path.lstrip("/")
        if actual_path.exists():
            actual_path.unlink()
            return True
        return False
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists in local storage."""
        actual_path = self.base_path.parent / file_path.lstrip("/")
        return actual_path.exists()


# Factory function
def get_file_service() -> FileService:
    """Get the appropriate file service based on configuration."""
    # Future: check settings.STORAGE_TYPE and return S3Service if needed
    return LocalFileService()
