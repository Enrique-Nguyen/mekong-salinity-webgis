from typing import TypeVar, Generic, Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from ..core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common CRUD operations."""

    def __init__(self, model: type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: UUID) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, obj_in: dict) -> ModelType:
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, id: UUID, obj_in: dict) -> Optional[ModelType]:
        db_obj = self.get_by_id(id)
        if db_obj:
            for key, value in obj_in.items():
                setattr(db_obj, key, value)
            self.db.commit()
            self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: UUID) -> bool:
        db_obj = self.get_by_id(id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()
            return True
        return False
