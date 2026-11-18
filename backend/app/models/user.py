"""
User document model.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import EmailStr, Field


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Document):
    """User account in Evolora."""

    email: EmailStr
    name: str
    hashed_password: str
    avatar_url: Optional[str] = None
    plan: PlanType = PlanType.FREE
    daily_llm_calls: int = 0
    daily_llm_calls_reset_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = ["email"]

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "name": "John Doe",
                "plan": "free",
            }
        }
