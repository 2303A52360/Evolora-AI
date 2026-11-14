"""
JobTarget document model — stores parsed job descriptions and extracted skills.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document, Link
from pydantic import Field


class SeniorityLevel(str, Enum):
    INTERN = "intern"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    PRINCIPAL = "principal"
    UNKNOWN = "unknown"


class JobTarget(Document):
    """A job description submitted by a user for interview prep."""

    user_id: str  # Reference to User._id
    raw_jd: str  # Original pasted or scraped JD text
    source_url: Optional[str] = None

    # Extracted by NVIDIA NIM (meta/llama-3.3-70b-instruct)
    role_title: Optional[str] = None
    seniority: SeniorityLevel = SeniorityLevel.UNKNOWN
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    interview_focus_areas: list[str] = Field(default_factory=list)
    extracted_raw: Optional[dict] = None  # Full NVIDIA response for debugging

    # Cache key for question generation deduplication
    role_signature: Optional[str] = None

    is_processed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "job_targets"
        indexes = ["user_id", "role_signature"]
