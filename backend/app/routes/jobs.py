"""
Job target routes — submit JD, get extraction results, list targets.
"""

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks

from app.core.security import get_current_user
from app.models.user import User
from app.models.job_target import JobTarget
from app.schemas.job_target import (
    JDSubmitRequest,
    JobTargetResponse,
    JobTargetListResponse,
)
from app.services.jd_extraction import extract_jd_skills, infer_role_title

router = APIRouter(prefix="/jobs", tags=["Job Targets"])


def _job_target_to_response(jt: JobTarget) -> JobTargetResponse:
    """Convert a JobTarget document to response schema."""
    role_title = jt.role_title
    if not role_title or role_title.lower() in {"unknown role", "target role", "unknown", "n/a", "none"}:
        role_title = infer_role_title(jt.raw_jd, jt.source_url)

    return JobTargetResponse(
        id=str(jt.id),
        raw_jd=jt.raw_jd,
        source_url=jt.source_url,
        role_title=role_title,
        seniority=jt.seniority.value if hasattr(jt.seniority, "value") else str(jt.seniority),
        required_skills=jt.required_skills,
        preferred_skills=jt.preferred_skills,
        tech_stack=jt.tech_stack,
        responsibilities=jt.responsibilities,
        soft_skills=jt.soft_skills,
        interview_focus_areas=jt.interview_focus_areas,
        is_processed=jt.is_processed,
        created_at=jt.created_at.isoformat(),
    )


@router.post("/", response_model=JobTargetResponse, status_code=status.HTTP_201_CREATED)
async def submit_job_description(
    payload: JDSubmitRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Submit a job description for AI-powered skill extraction.
    
    If source_url is provided and raw_jd is too short, automatically
    scrape the URL to extract the job description text.
    """
    raw_jd = payload.raw_jd
    source_url = payload.source_url

    # Auto-scrape URL if raw_jd is too short but URL is provided
    if source_url and len(raw_jd.strip()) < 50:
        from app.services.url_scraper import scrape_job_url
        scraped_text = await scrape_job_url(source_url)
        if scraped_text and len(scraped_text) >= 50:
            raw_jd = scraped_text
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract job description from the provided URL. Please paste the job description manually.",
            )

    # Create the job target record
    job_target = JobTarget(
        user_id=str(current_user.id),
        raw_jd=raw_jd,
        source_url=source_url,
    )
    await job_target.insert()

    # Kick off extraction in background (don't block the response on LLM call)
    background_tasks.add_task(extract_jd_skills, str(job_target.id))

    return _job_target_to_response(job_target)


@router.get("/", response_model=JobTargetListResponse)
async def list_job_targets(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_user),
):
    """List all job targets for the current user."""
    skip = (page - 1) * per_page

    total = await JobTarget.find(JobTarget.user_id == str(current_user.id)).count()
    items = (
        await JobTarget.find(JobTarget.user_id == str(current_user.id))
        .sort(-JobTarget.created_at)
        .skip(skip)
        .limit(per_page)
        .to_list()
    )

    return JobTargetListResponse(
        items=[_job_target_to_response(jt) for jt in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{job_target_id}", response_model=JobTargetResponse)
async def get_job_target(
    job_target_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific job target with extraction results."""
    job_target = await JobTarget.get(job_target_id)
    if not job_target or job_target.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job target not found",
        )

    return _job_target_to_response(job_target)


@router.delete("/{job_target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_target(
    job_target_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a job target."""
    job_target = await JobTarget.get(job_target_id)
    if not job_target or job_target.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job target not found",
        )

    await job_target.delete()


@router.post("/{job_target_id}/re-extract", response_model=JobTargetResponse)
async def re_extract_job_target(
    job_target_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Re-run AI skill extraction on an existing job target."""
    job_target = await JobTarget.get(job_target_id)
    if not job_target or job_target.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job target not found",
        )

    # Reset extraction state
    job_target.is_processed = False
    job_target.role_title = None
    job_target.required_skills = []
    job_target.preferred_skills = []
    job_target.tech_stack = []
    job_target.responsibilities = []
    job_target.soft_skills = []
    job_target.interview_focus_areas = []
    job_target.role_signature = None
    await job_target.save()

    background_tasks.add_task(extract_jd_skills, str(job_target.id))

    return _job_target_to_response(job_target)
