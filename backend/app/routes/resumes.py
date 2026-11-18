"""
Resume API routes — generate, list, and retrieve ATS-safe resumes.
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from loguru import logger
from pydantic import BaseModel, Field
from typing import Optional

from app.core.security import get_current_user
from app.models.user import User
from app.services.resume_service import (
    generate_resume,
    get_user_resumes,
    get_resume,
    extract_text_from_file_bytes,
    parse_uploaded_resume_text,
    refine_candidate_profile_with_ai,
)


router = APIRouter(prefix="/resumes", tags=["Resumes"])


# ── Request / Response schemas ────────────────────────────────────────────────

class ExperienceEntry(BaseModel):
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    start_date: str = Field(default="", description="Start date (e.g. 'Jan 2020')")
    end_date: str = Field(default="Present", description="End date (e.g. 'Dec 2023' or 'Present')")
    bullets: list[str] = Field(default_factory=list, description="Responsibility/achievement bullet points")


class EducationEntry(BaseModel):
    degree: str = Field(..., description="Degree name (e.g. 'B.S. Computer Science')")
    school: str = Field(..., description="School/university name")
    year: str = Field(default="", description="Graduation year")


class ResumeProfile(BaseModel):
    full_name: str = Field(..., description="Candidate's full name")
    email: str = Field(default="", description="Contact email")
    phone: str = Field(default="", description="Contact phone")
    location: str = Field(default="", description="City, State/Country")
    linkedin_url: str = Field(default="", description="LinkedIn profile URL")
    summary: str = Field(default="", description="Professional summary (2-3 sentences)")
    experience: list[ExperienceEntry] = Field(default_factory=list, description="Work experience entries")
    education: list[EducationEntry] = Field(default_factory=list, description="Education entries")
    skills: list[str] = Field(default_factory=list, description="Technical and soft skills")


class GenerateResumeRequest(BaseModel):
    job_target_id: str = Field(..., description="Job target ID to tailor the resume for")
    profile: ResumeProfile = Field(..., description="Candidate profile data")
    length_mode: str = Field(default="full", description="'full' (1 page) or 'half' (~50-65% page)")


class ResumeResponse(BaseModel):
    id: str
    job_target_id: str
    ats_score: float
    ats_breakdown: dict
    length_mode: str
    total_attempts: int
    status: str
    latex_source: Optional[str] = None
    pdf_compiled: bool
    created_at: str

    class Config:
        from_attributes = True


class ResumeDetailResponse(ResumeResponse):
    profile: dict
    iterations: list[dict]
    compilation_error: Optional[str] = None


class ParseTextRequest(BaseModel):
    text: str = Field(..., description="Raw text of candidate's existing resume")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/parse-file", response_model=ResumeProfile)
async def parse_resume_file_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Extract structured candidate profile from an uploaded resume file (PDF, TXT, TEX, MD)."""
    try:
        content = await file.read()
        raw_text = extract_text_from_file_bytes(content, file.filename or "resume.txt")
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")
        profile_dict = await parse_uploaded_resume_text(raw_text)
        return ResumeProfile(**profile_dict)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to parse resume file: {}", str(exc))
        raise HTTPException(status_code=500, detail="Failed to parse resume file")


@router.post("/parse-text", response_model=ResumeProfile)
async def parse_resume_text_endpoint(
    request: ParseTextRequest,
    current_user: User = Depends(get_current_user),
):
    """Extract structured candidate profile from pasted raw resume text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    try:
        profile_dict = await parse_uploaded_resume_text(request.text)
        return ResumeProfile(**profile_dict)
    except Exception as exc:
        logger.error("Failed to parse resume text: {}", str(exc))
        raise HTTPException(status_code=500, detail="Failed to parse resume text")


@router.post("/refine-profile", response_model=ResumeProfile)
async def refine_profile_endpoint(
    request: ResumeProfile,
    current_user: User = Depends(get_current_user),
):
    """Use AI to refine, clean up, and auto-fill candidate profile fields."""
    try:
        refined = await refine_candidate_profile_with_ai(request.model_dump())
        return ResumeProfile(**refined)
    except Exception as exc:
        logger.error("Failed to refine profile: {}", str(exc))
        raise HTTPException(status_code=500, detail="Failed to refine candidate profile")



@router.post("/generate", response_model=ResumeDetailResponse)
async def generate_resume_endpoint(
    request: GenerateResumeRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate an ATS-safe LaTeX resume through the generate→score→regenerate loop.

    Iterates up to 4 times targeting a 90+ ATS rubric score.
    Always returns the best attempt seen.
    """
    # Validate length mode
    if request.length_mode not in ("full", "half"):
        raise HTTPException(status_code=400, detail="length_mode must be 'full' or 'half'")

    try:
        resume = await generate_resume(
            user_id=str(current_user.id),
            job_target_id=request.job_target_id,
            profile=request.profile.model_dump(),
            length_mode=request.length_mode,
        )

        return ResumeDetailResponse(
            id=str(resume.id),
            job_target_id=resume.job_target_id,
            ats_score=resume.ats_score,
            ats_breakdown=resume.ats_breakdown,
            length_mode=resume.length_mode.value,
            total_attempts=resume.total_attempts,
            status=resume.status.value,
            latex_source=resume.latex_source,
            pdf_compiled=resume.pdf_compiled,
            created_at=resume.created_at.isoformat(),
            profile=resume.profile,
            iterations=resume.iterations,
            compilation_error=resume.compilation_error,
        )

    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Resume generation failed: {}", str(exc))
        raise HTTPException(status_code=500, detail="Resume generation failed. Please try again.")


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: User = Depends(get_current_user),
):
    """List all resumes for the authenticated user, most recent first."""
    resumes = await get_user_resumes(str(current_user.id))
    return [
        ResumeResponse(
            id=str(r.id),
            job_target_id=r.job_target_id,
            ats_score=r.ats_score,
            ats_breakdown=r.ats_breakdown,
            length_mode=r.length_mode.value,
            total_attempts=r.total_attempts,
            status=r.status.value,
            latex_source=r.latex_source,
            pdf_compiled=r.pdf_compiled,
            created_at=r.created_at.isoformat(),
        )
        for r in resumes
    ]


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
async def get_resume_detail(
    resume_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about a specific resume including all iterations."""
    resume = await get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this resume")

    return ResumeDetailResponse(
        id=str(resume.id),
        job_target_id=resume.job_target_id,
        ats_score=resume.ats_score,
        ats_breakdown=resume.ats_breakdown,
        length_mode=resume.length_mode.value,
        total_attempts=resume.total_attempts,
        status=resume.status.value,
        latex_source=resume.latex_source,
        pdf_compiled=resume.pdf_compiled,
        created_at=resume.created_at.isoformat(),
        profile=resume.profile,
        iterations=resume.iterations,
        compilation_error=resume.compilation_error,
    )


@router.get("/{resume_id}/download")
async def download_latex(
    resume_id: str,
    current_user: User = Depends(get_current_user),
):
    """Download the raw .tex source file for a generated resume."""
    resume = await get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if resume.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if not resume.latex_source:
        raise HTTPException(status_code=404, detail="No LaTeX source available for this resume")

    from fastapi.responses import Response

    return Response(
        content=resume.latex_source,
        media_type="application/x-tex",
        headers={
            "Content-Disposition": f'attachment; filename="resume_{resume_id}.tex"',
        },
    )


class CompileLatexRequest(BaseModel):
    latex_source: str = Field(..., description="LaTeX source code to compile")


class CompileLatexResponse(BaseModel):
    pdf_compiled: bool
    pdf_b64: Optional[str] = None
    compilation_error: Optional[str] = None


@router.post("/compile", response_model=CompileLatexResponse)
async def compile_latex_endpoint(
    request: CompileLatexRequest,
    current_user: User = Depends(get_current_user),
):
    """Compile arbitrary LaTeX source code into a PDF base64 string on demand."""
    from app.services.resume_service import compile_pdf_tectonic
    pdf_compiled, pdf_b64, comp_err = await compile_pdf_tectonic(request.latex_source)
    return CompileLatexResponse(
        pdf_compiled=pdf_compiled,
        pdf_b64=pdf_b64,
        compilation_error=comp_err,
    )
