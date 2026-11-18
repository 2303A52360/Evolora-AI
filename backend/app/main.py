"""
Evolora API — Main FastAPI Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("Shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Personalized Interview Preparation Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Root & Health check ────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """Root endpoint — verifies the API is online."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint — returns 200 if the API is running."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME,
    }


# ── Register routers ─────────────────────────────────────────────────────────

from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.routes.assessments import router as assessments_router
from app.routes.interviews import router as interviews_router
from app.routes.evaluations import router as evaluations_router
from app.routes.resumes import router as resumes_router

app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(jobs_router, prefix=settings.API_PREFIX)
app.include_router(assessments_router, prefix=settings.API_PREFIX)
app.include_router(interviews_router, prefix=settings.API_PREFIX)
app.include_router(evaluations_router, prefix=settings.API_PREFIX)
app.include_router(resumes_router, prefix=settings.API_PREFIX)
