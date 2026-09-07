"""Public surface — ``/api/f/{slug}``.

Nothing here accepts or returns a numeric form ID, serves a draft, or exposes a
collected response. It is the only part of the API a respondent ever reaches,
and it requires no authentication by design.
"""

from fastapi import APIRouter, Request

from app.routers.deps import (
    DbSession,
    FormClosedError,
    FormError,
    conflict,
    not_found,
    validation_error,
)
from app.schemas import PublicFormOut, SubmissionIn, SubmissionOut
from app.services import forms as form_service
from app.services import responses as response_service
from app.services.validation import AnswerValidationError

router = APIRouter(prefix="/api/f", tags=["public"])


@router.get("/{slug}", response_model=PublicFormOut)
def get_public_form(slug: str, db: DbSession):
    try:
        form = form_service.get_published_form(db, slug)
    except FormError as error:
        raise not_found(error) from error

    return PublicFormOut(
        slug=form.slug,
        title=form.title,
        welcome_screen=form.welcome_screen,
        theme=form.theme,
        settings=form.settings or {},
        accepting_responses=form.accepting_responses,
        questions=form.live_questions,
    )


@router.post("/{slug}/responses", response_model=SubmissionOut)
def submit(slug: str, payload: SubmissionIn, request: Request, db: DbSession):
    try:
        form = form_service.get_published_form(db, slug)
    except FormError as error:
        raise not_found(error) from error

    payload.meta = {
        **(payload.meta or {}),
        "user_agent": request.headers.get("user-agent", ""),
        "referrer": request.headers.get("referer", ""),
    }

    try:
        return response_service.submit_response(db, form, payload)
    except FormClosedError as error:
        raise conflict(error) from error
    except AnswerValidationError as error:
        raise validation_error(error) from error
