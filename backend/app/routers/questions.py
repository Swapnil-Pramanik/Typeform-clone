"""Authoring surface — question-scoped routes at ``/api/questions/*``."""

from fastapi import APIRouter, Response, status

from app.routers.deps import DbSession, QuestionError, bad_request, not_found
from app.schemas import QuestionOut, QuestionUpdate, RulesIn
from app.services import questions as question_service

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(question_id: int, payload: QuestionUpdate, db: DbSession):
    try:
        return question_service.update_question(db, question_id, payload)
    except QuestionError as error:
        raise not_found(error) from error


@router.put("/{question_id}/rules", response_model=QuestionOut)
def set_rules(question_id: int, payload: RulesIn, db: DbSession):
    """Replace this question's branching rules with the complete list sent."""
    try:
        return question_service.set_rules(db, question_id, payload.rules)
    except QuestionError as error:
        message = str(error)
        raise (not_found if "not found" in message.lower() else bad_request)(
            error
        ) from error


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: DbSession):
    """Soft delete — the row survives so historical answers keep their target."""
    try:
        question_service.delete_question(db, question_id)
    except QuestionError as error:
        raise not_found(error) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
