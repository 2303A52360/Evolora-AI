"""
Resume document model — stores generated ATS-safe LaTeX resumes.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import Field


class LengthMode(str, Enum):
    HALF = "half"
    FULL = "full"


class ResumeStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Resume(Document):
    """An ATS-safe LaTeX resume generated for a user + job target."""

    user_id: str  # Reference to User._id
    job_target_id: str  # Reference to JobTarget._id

    # User-supplied profile data used for generation
    profile: dict = Field(default_factory=dict)
    # {
    #   "full_name": "...",
    #   "email": "...",
    #   "phone": "...",
    #   "location": "...",
    #   "linkedin_url": "...",
    #   "summary": "...",
    #   "experience": [{ "title": "...", "company": "...", "start_date": "...", "end_date": "...", "bullets": [...] }],
    #   "education": [{ "degree": "...", "school": "...", "year": "..." }],
    #   "skills": ["..."],
    # }

    # Best result
    latex_source: Optional[str] = None
    ats_score: float = 0.0  # Best ATS rubric score (0-100)
    ats_breakdown: dict = Field(default_factory=dict)
    # {
    #   "keyword_coverage": 18,
    #   "structure": 19,
    #   "ats_safe_formatting": 20,
    #   "quantified_bullets": 17,
    #   "length_density": 18,
    # }

    length_mode: LengthMode = LengthMode.FULL

    # Per-attempt history
    iterations: list[dict] = Field(default_factory=list)
    # [{ "attempt": 1, "score": 78, "breakdown": {...}, "gaps": [...], "latex_source": "..." }]

    total_attempts: int = 0
    status: ResumeStatus = ResumeStatus.PENDING

    # PDF data (base64-encoded, if compiled successfully)
    pdf_compiled: bool = False
    compilation_error: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "resumes"
        indexes = ["user_id", "job_target_id"]
