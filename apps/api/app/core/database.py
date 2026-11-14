"""
MongoDB connection setup using Motor (async driver) + Beanie (ODM).
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from loguru import logger

from app.core.config import settings


client: AsyncIOMotorClient = None  # type: ignore


async def connect_to_mongo():
    """Initialize MongoDB connection and Beanie ODM."""
    global client

    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Import all document models here
    from app.models.user import User
    from app.models.job_target import JobTarget
    from app.models.assessment import Assessment
    from app.models.attempt import Attempt
    from app.models.interview_session import InterviewSession
    from app.models.evaluation import Evaluation
    from app.core.rate_limit import UserUsageTracker
    from app.models.resume import Resume

    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[
            User,
            JobTarget,
            Assessment,
            Attempt,
            InterviewSession,
            Evaluation,
            UserUsageTracker,
            Resume,
        ],
    )
    logger.info("MongoDB connection established and Beanie initialized.")


async def close_mongo_connection():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")
