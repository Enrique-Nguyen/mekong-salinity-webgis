from pydantic import BaseModel, EmailStr
from typing import Optional


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
