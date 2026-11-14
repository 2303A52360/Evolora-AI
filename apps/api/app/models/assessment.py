"""
Assessment document model — generated question sets tied to a job target.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import Field


class AssessmentType(str, Enum):
    MCQ = "mcq"
    SHORT_ANSWER = "short_answer"
    CODING = "coding"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Question(dict):
    """Individual question within an assessment.
    Structure:
    {
        "id": "q1",
        "type": "mcq" | "short_answer" | "coding" | "behavioral",
        "text": "...",
        "options": ["A", "B", "C", "D"],  # MCQ only
        "correct_answer": "B",             # MCQ only
        "rubric": "...",                    # For short_answer/behavioral
        "difficulty": "easy" | "medium" | "hard",
        "skill_tested": "python",
        "time_limit_seconds": 120
    }
    """
    pass


class Assessment(Document):
    """A generated set of questions for a specific job target."""

    job_target_id: str  # Reference to JobTarget._id
    type: AssessmentType = AssessmentType.MIXED
    difficulty: Difficulty = Difficulty.MEDIUM
    question_set: list[dict] = Field(default_factory=list)
    total_questions: int = 0
    estimated_duration_minutes: int = 30
    skills_covered: list[str] = Field(default_factory=list)

    # Cache: if another user has the same role_signature, reuse this assessment
    role_signature: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "assessments"
        indexes = ["job_target_id", "role_signature"]
