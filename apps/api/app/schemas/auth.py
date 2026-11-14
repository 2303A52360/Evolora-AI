"""
Auth request/response schemas.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    """User registration payload."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """User login payload."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    """Token refresh payload."""
    refresh_token: str


class UserResponse(BaseModel):
    """Public user profile response."""
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    plan: str
    created_at: str
