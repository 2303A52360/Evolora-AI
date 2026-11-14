"""
InterviewSession document model — turn-based mock interview conversations.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document
from pydantic import Field


class InterviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class InterviewMode(str, Enum):
    TEXT = "text"
    VOICE = "voice"


class InterviewSession(Document):
    """A mock interview session — turn-based Q&A with follow-ups."""

    user_id: str  # Reference to User._id
    job_target_id: str  # Reference to JobTarget._id

    mode: InterviewMode = InterviewMode.TEXT
    status: InterviewStatus = InterviewStatus.PENDING

    # Conversation transcript — ordered list of turns
    transcript: list[dict] = Field(default_factory=list)
    # Each turn: { "role": "interviewer"|"candidate", "content": "...", "timestamp": "..." }

    # State machine tracking
    current_question_index: int = 0
    total_questions: int = 5
    follow_up_depth: int = 0
    max_follow_up_depth: int = 2

    # Question plan generated at session start
    question_plan: list[dict] = Field(default_factory=list)
    # Each: { "skill": "...", "question": "...", "type": "technical"|"behavioral" }

    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "interview_sessions"
        indexes = ["user_id", "job_target_id", "status"]
