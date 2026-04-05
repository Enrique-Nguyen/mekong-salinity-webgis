from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from .base import BaseRepository
from ..models.upload import Upload


class UploadRepository(BaseRepository[Upload]):
    def __init__(self, db: Session):
        super().__init__(Upload, db)

    def get_by_user_id(
        self, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Upload]:
        return (
            self.db.query(Upload)
            .filter(Upload.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_status(
        self,
        upload_id: UUID,
        status: str,
        total_rows: int = 0,
        valid_rows: int = 0,
        invalid_rows: int = 0,
    ) -> Optional[Upload]:
        return self.update(
            upload_id,
            {
                "status": status,
                "total_rows": total_rows,
                "valid_rows": valid_rows,
                "invalid_rows": invalid_rows,
            },
        )
