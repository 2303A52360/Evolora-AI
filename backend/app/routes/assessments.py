"""Assessment routes — generate question sets, retrieve assessments, and submit attempts."""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.core.rate_limit import check_and_increment_llm_quota
from app.models.user import User
from app.models.assessment import Assessment, AssessmentType, Difficulty
from app.models.attempt import Attempt, AttemptStatus
from app.services.question_generation import generate_assessment_for_job
from app.services.evaluation_service import evaluate_interview_session
from app.services.code_executor import execute_code_against_test_cases, CodeExecutionRequest, CodeExecutionResponse

router = APIRouter(prefix="/assessments", tags=["Assessments"])


class GenerateAssessmentRequest(BaseModel):
    job_target_id: str
    type: AssessmentType = AssessmentType.MIXED
    difficulty: Difficulty = Difficulty.MEDIUM


class SubmitAssessmentRequest(BaseModel):
    answers: dict = Field(..., description="Mapping of question_id to user_answer")
    time_spent_seconds: int = 0


class RunCodeEndpointRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: list[dict] = Field(default_factory=list)


@router.post("/run-code", response_model=dict)
async def run_code_sandbox(
    payload: RunCodeEndpointRequest,
    current_user: User = Depends(get_current_user),
):
    """Execute candidate code against test cases in the real code execution sandbox."""
    res = execute_code_against_test_cases(
        code=payload.code,
        language=payload.language,
        test_cases=payload.test_cases,
    )
    return res.model_dump()



@router.post("/generate", response_model=dict, status_code=status.HTTP_201_CREATED)
async def generate_assessment(
    payload: GenerateAssessmentRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate or retrieve a cached assessment for a job target."""
    await check_and_increment_llm_quota(str(current_user.id))

    assessment = await generate_assessment_for_job(
        job_target_id=payload.job_target_id,
        assessment_type=payload.type,
        difficulty=payload.difficulty,
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate assessment. Please try again later.",
        )

    return {
        "id": str(assessment.id),
        "job_target_id": assessment.job_target_id,
        "type": assessment.type.value,
        "difficulty": assessment.difficulty.value,
        "question_set": assessment.question_set,
        "total_questions": assessment.total_questions,
        "estimated_duration_minutes": assessment.estimated_duration_minutes,
        "skills_covered": assessment.skills_covered,
    }


@router.get("/{assessment_id}", response_model=dict)
async def get_assessment(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific assessment set by ID."""
    assessment = await Assessment.get(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    return {
        "id": str(assessment.id),
        "job_target_id": assessment.job_target_id,
        "type": assessment.type.value,
        "difficulty": assessment.difficulty.value,
        "question_set": assessment.question_set,
        "total_questions": assessment.total_questions,
        "estimated_duration_minutes": assessment.estimated_duration_minutes,
        "skills_covered": assessment.skills_covered,
    }


@router.post("/{assessment_id}/submit", response_model=dict)
async def submit_assessment(
    assessment_id: str,
    payload: SubmitAssessmentRequest,
    current_user: User = Depends(get_current_user),
):
    """Submit candidate answers for an assessment and compute evaluation scores/marks."""
    assessment = await Assessment.get(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    correct_mcqs = 0
    total_mcqs = 0
    coding_passed = 0
    total_coding_cases = 0

    for q in assessment.question_set:
        q_type = q.get("type")
        q_id = q.get("id")

        if q_type == "mcq":
            total_mcqs += 1
            user_ans = payload.answers.get(q_id)
            if user_ans and user_ans.strip().lower() == str(q.get("correct_answer", "")).strip().lower():
                correct_mcqs += 1
        elif q_type == "coding":
            user_code = payload.answers.get(q_id)
            raw_cases = q.get("test_cases") or []
            if raw_cases:
                formatted_cases = []
                for idx, tc in enumerate(raw_cases):
                    if isinstance(tc, dict):
                        formatted_cases.append({
                            "description": tc.get("description") or f"Test Case #{idx + 1}",
                            "input": str(tc.get("input", "")),
                            "expected_output": str(tc.get("expected_output") or tc.get("expectedOutput") or ""),
                            "is_hidden": tc.get("is_hidden") or tc.get("isHidden") or False,
                        })
                    elif isinstance(tc, str):
                        formatted_cases.append({
                            "description": tc,
                            "input": "",
                            "expected_output": "",
                            "is_hidden": False,
                        })

                if formatted_cases and user_code:
                    exec_res = execute_code_against_test_cases(
                        code=user_code,
                        language=q.get("language", "python"),
                        test_cases=formatted_cases,
                    )
                    coding_passed += exec_res.passed_test_cases
                    total_coding_cases += exec_res.total_test_cases
                else:
                    total_coding_cases += len(raw_cases)

    mcq_score = (correct_mcqs / total_mcqs * 100.0) if total_mcqs > 0 else None
    coding_score = (coding_passed / total_coding_cases * 100.0) if total_coding_cases > 0 else None

    if mcq_score is not None and coding_score is not None:
        final_score = round(mcq_score * 0.5 + coding_score * 0.5, 1)
    elif mcq_score is not None:
        final_score = round(mcq_score, 1)
    elif coding_score is not None:
        final_score = round(coding_score, 1)
    else:
        final_score = 0.0

    attempt = Attempt(
        assessment_id=assessment_id,
        user_id=str(current_user.id),
        answers=payload.answers,
        status=AttemptStatus.COMPLETED,
        time_spent_seconds=payload.time_spent_seconds,
        score=final_score,
    )
    await attempt.insert()

    return {
        "attempt_id": str(attempt.id),
        "assessment_id": assessment_id,
        "status": attempt.status.value,
        "score": final_score,
        "correct_mcqs": correct_mcqs,
        "total_mcqs": total_mcqs,
        "coding_passed": coding_passed,
        "total_coding_cases": total_coding_cases,
    }
