"""Evaluation routes — retrieve evaluation details and list user evaluations."""

from fastapi import APIRouter, HTTPException, status, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.models.evaluation import Evaluation

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


@router.get("/{evaluation_id}", response_model=dict)
async def get_evaluation(
    evaluation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific evaluation by ID."""
    evaluation = await Evaluation.get(evaluation_id)
    if not evaluation or evaluation.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )

    return {
        "id": str(evaluation.id),
        "session_id": evaluation.session_id,
        "attempt_id": evaluation.attempt_id,
        "type": evaluation.type.value,
        "rubric_scores": evaluation.rubric_scores,
        "overall_score": evaluation.overall_score,
        "grade": evaluation.grade,
        "strengths": evaluation.strengths,
        "weaknesses": evaluation.weaknesses,
        "recommendations": evaluation.recommendations,
        "skill_scores": evaluation.skill_scores,
        "study_plan": evaluation.study_plan,
        "created_at": evaluation.created_at.isoformat(),
    }


@router.get("/", response_model=dict)
async def list_evaluations(
    current_user: User = Depends(get_current_user),
):
    """List evaluations for current user."""
    items = (
        await Evaluation.find(Evaluation.user_id == str(current_user.id))
        .sort(-Evaluation.created_at)
        .limit(50)
        .to_list()
    )

    return {
        "items": [
            {
                "id": str(e.id),
                "session_id": e.session_id,
                "attempt_id": e.attempt_id,
                "type": e.type.value,
                "overall_score": e.overall_score,
                "grade": e.grade,
                "created_at": e.created_at.isoformat(),
            }
            for e in items
        ],
        "total": len(items),
    }
