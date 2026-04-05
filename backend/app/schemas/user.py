from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    role: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
