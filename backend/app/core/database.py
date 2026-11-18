"""
MongoDB connection setup using Motor (async driver) + Beanie (ODM).
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from loguru import logger

from app.core.config import settings


client: Optional[AsyncIOMotorClient] = None
is_mongo_connected: bool = False
mongo_error_message: str = ""


async def connect_to_mongo():
    """Initialize MongoDB connection and Beanie ODM without crashing on misconfiguration."""
    global client, is_mongo_connected, mongo_error_message

    if "<db_password>" in settings.MONGODB_URL:
        mongo_error_message = (
            "MONGODB_URL contains placeholder '<db_password>'. "
            "Please set your real MongoDB password in environment variables."
        )
        logger.error(mongo_error_message)
        is_mongo_connected = False
        return

    # Redact password in logs for security
    import re
    safe_url = re.sub(r":([^@]+)@", r":****@", settings.MONGODB_URL)
    logger.info(f"Connecting to MongoDB at {safe_url}...")

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
        )

        # Import all document models
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
        is_mongo_connected = True
        mongo_error_message = ""
        logger.info("MongoDB connection established and Beanie initialized.")
    except Exception as exc:
        is_mongo_connected = False
        mongo_error_message = f"Failed to connect to MongoDB: {exc}"
        logger.error(mongo_error_message)
        logger.warning("Backend started in degraded mode — web server online, database offline.")


async def close_mongo_connection():
    """Close MongoDB connection."""
    global client, is_mongo_connected
    if client:
        client.close()
        is_mongo_connected = False
        logger.info("MongoDB connection closed.")
