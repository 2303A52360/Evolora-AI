"""
Attempt document model — user's answers to an assessment.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import Field


class AttemptStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    EVALUATED = "evaluated"


class Attempt(Document):
    """A user's attempt at answering an assessment."""

    assessment_id: str  # Reference to Assessment._id
    user_id: str  # Reference to User._id

    answers: list[dict] = Field(default_factory=list)
    # Each answer: { "question_id": "q1", "answer": "...", "time_taken_seconds": 45 }

    status: AttemptStatus = AttemptStatus.IN_PROGRESS
    score: Optional[float] = None  # 0-100 overall score
    max_score: float = 100.0

    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: Optional[datetime] = None

    class Settings:
        name = "attempts"
        indexes = ["user_id", "assessment_id"]
