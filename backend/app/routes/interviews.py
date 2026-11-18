"""Mock interview routes — start session, submit candidate responses, get transcript, and request evaluation."""

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.rate_limit import check_and_increment_llm_quota
from app.models.user import User
from app.models.interview_session import InterviewSession, InterviewMode, InterviewStatus
from app.services.interview_service import start_interview_session, process_candidate_turn
from app.services.evaluation_service import evaluate_interview_session

router = APIRouter(prefix="/interviews", tags=["Mock Interviews"])


class StartInterviewRequest(BaseModel):
    job_target_id: str
    mode: InterviewMode = InterviewMode.TEXT


class RespondInterviewRequest(BaseModel):
    candidate_answer: str = Field(..., min_length=1, description="Candidate response text")


@router.post("/start", response_model=dict, status_code=status.HTTP_201_CREATED)
async def start_interview(
    payload: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Start a turn-based mock interview session."""
    await check_and_increment_llm_quota(str(current_user.id))

    session = await start_interview_session(
        user_id=str(current_user.id),
        job_target_id=payload.job_target_id,
        mode=payload.mode,
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job target not found or invalid.",
        )

    return {
        "session_id": str(session.id),
        "job_target_id": session.job_target_id,
        "mode": session.mode.value,
        "status": session.status.value,
        "current_question_index": session.current_question_index,
        "total_questions": session.total_questions,
        "transcript": session.transcript,
    }


@router.post("/{session_id}/respond", response_model=dict)
async def respond_to_interview(
    session_id: str,
    payload: RespondInterviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Submit candidate response and receive interviewer follow-up or next question."""
    await check_and_increment_llm_quota(str(current_user.id))

    session = await process_candidate_turn(
        session_id=session_id,
        user_id=str(current_user.id),
        candidate_answer=payload.candidate_answer,
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found or unauthorized.",
        )

    return {
        "session_id": str(session.id),
        "status": session.status.value,
        "current_question_index": session.current_question_index,
        "total_questions": session.total_questions,
        "transcript": session.transcript,
    }


@router.get("/{session_id}", response_model=dict)
async def get_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get details and transcript for an interview session."""
    session = await InterviewSession.get(session_id)
    if not session or session.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    return {
        "session_id": str(session.id),
        "job_target_id": session.job_target_id,
        "mode": session.mode.value,
        "status": session.status.value,
        "current_question_index": session.current_question_index,
        "total_questions": session.total_questions,
        "transcript": session.transcript,
        "created_at": session.created_at.isoformat(),
    }


@router.post("/{session_id}/evaluate", response_model=dict)
async def trigger_interview_evaluation(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Evaluate completed interview transcript using NVIDIA NIM rubric scoring."""
    session = await InterviewSession.get(session_id)
    if not session or session.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    await check_and_increment_llm_quota(str(current_user.id))

    evaluation = await evaluate_interview_session(session_id)

    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate interview session.",
        )

    return {
        "evaluation_id": str(evaluation.id),
        "session_id": evaluation.session_id,
        "overall_score": evaluation.overall_score,
        "grade": evaluation.grade,
        "rubric_scores": evaluation.rubric_scores,
        "strengths": evaluation.strengths,
        "weaknesses": evaluation.weaknesses,
        "recommendations": evaluation.recommendations,
        "study_plan": evaluation.study_plan,
        "question_critiques": getattr(evaluation, "question_critiques", []),
    }
