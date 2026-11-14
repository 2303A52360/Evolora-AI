"""
Job target request/response schemas.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional


class JDSubmitRequest(BaseModel):
    """Submit a job description for analysis."""
    raw_jd: str = Field(default="", max_length=20000, description="Pasted job description text (can be empty if source_url is provided)")
    source_url: Optional[str] = None


class ExtractedSkillsResponse(BaseModel):
    """Structured extraction result from a job description."""
    role_title: str
    seniority: str
    required_skills: list[str]
    preferred_skills: list[str] = Field(default_factory=list)
    tech_stack: list[str]
    responsibilities: list[str]
    soft_skills: list[str]
    interview_focus_areas: list[str] = Field(default_factory=list)


class JobTargetResponse(BaseModel):
    """Full job target with extraction results."""
    id: str
    raw_jd: str
    source_url: Optional[str]
    role_title: Optional[str]
    seniority: str
    required_skills: list[str]
    preferred_skills: list[str] = Field(default_factory=list)
    tech_stack: list[str]
    responsibilities: list[str]
    soft_skills: list[str]
    interview_focus_areas: list[str] = Field(default_factory=list)
    is_processed: bool
    created_at: str


class JobTargetListResponse(BaseModel):
    """Paginated list of job targets."""
    items: list[JobTargetResponse]
    total: int
    page: int
    per_page: int
