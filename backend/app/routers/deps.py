"""Shared router plumbing: the session dependency and error translation."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.forms import FormError
from app.services.questions import QuestionError
from app.services.validation import AnswerValidationError

DbSession = Annotated[Session, Depends(get_db)]


def not_found(error: Exception) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail=str(error))


def bad_request(error: Exception) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(error))


def validation_error(error: AnswerValidationError) -> HTTPException:
    """422 with the offending question ID, so the flow can jump to it."""
    return HTTPException(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail={"question_id": error.question_id, "message": error.message},
    )


__all__ = [
    "DbSession",
    "FormError",
    "QuestionError",
    "bad_request",
    "not_found",
    "validation_error",
]
