"""
Evaluation document model — rubric-based scoring and feedback.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import Field


class EvaluationType(str, Enum):
    ASSESSMENT = "assessment"
    INTERVIEW = "interview"


class Evaluation(Document):
    """Rubric-based evaluation of an attempt or interview session."""

    # One of these will be set
    attempt_id: Optional[str] = None  # Reference to Attempt._id
    session_id: Optional[str] = None  # Reference to InterviewSession._id
    user_id: str  # Reference to User._id

    type: EvaluationType

    # Rubric scores (0-10 each)
    rubric_scores: dict = Field(default_factory=dict)
    # {
    #   "relevance": 8,
    #   "correctness": 7,
    #   "clarity": 9,
    #   "completeness": 6,
    #   "depth": 7,
    #   "communication": 8
    # }

    overall_score: float = 0.0  # Weighted aggregate, 0-100
    grade: Optional[str] = None  # A, B, C, D, F

    # Qualitative feedback
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    question_critiques: list[dict] = Field(default_factory=list)

    # Per-skill breakdown
    skill_scores: dict = Field(default_factory=dict)
    # { "python": 85, "system_design": 60, "communication": 90 }

    # Study plan
    study_plan: list[dict] = Field(default_factory=list)
    # [{ "skill": "...", "priority": "high", "resources": [...], "practice_suggestions": [...] }]

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "evaluations"
        indexes = ["user_id", "attempt_id", "session_id"]
