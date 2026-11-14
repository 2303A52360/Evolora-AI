"""Rate limiting and daily LLM quota enforcement."""

from datetime import datetime, timezone
from fastapi import HTTPException, status
from loguru import logger
from beanie import Document
from pydantic import Field

from app.core.config import settings


class UserUsageTracker(Document):
    user_id: str
    date_str: str  # YYYY-MM-DD
    llm_call_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_usage_trackers"
        indexes = ["user_id", "date_str"]


async def check_and_increment_llm_quota(user_id: str) -> None:
    """Enforce daily LLM request limits per user."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tracker = await UserUsageTracker.find_one(
        UserUsageTracker.user_id == user_id,
        UserUsageTracker.date_str == today,
    )

    if not tracker:
        tracker = UserUsageTracker(user_id=user_id, date_str=today, llm_call_count=1)
        await tracker.insert()
        return

    if tracker.llm_call_count >= settings.LLM_CALLS_PER_USER_PER_DAY:
        logger.warning("Daily LLM quota exceeded for user: {}", user_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI request limit of {settings.LLM_CALLS_PER_USER_PER_DAY} reached. Please try again tomorrow.",
        )

    tracker.llm_call_count += 1
    tracker.updated_at = datetime.now(timezone.utc)
    await tracker.save()
