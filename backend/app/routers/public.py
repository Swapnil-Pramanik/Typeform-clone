"""Public surface — ``/api/f/{slug}``.

Nothing here accepts or returns a numeric form ID, serves a draft, or exposes a
collected response. It is the only part of the API a respondent ever reaches,
and it requires no authentication by design.
"""

from fastapi import APIRouter, Request
from pydantic import ValidationError

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


def _store(slug: str, payload: SubmissionIn, request: Request, db: DbSession):
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


@router.post("/{slug}/responses", response_model=SubmissionOut)
def submit(slug: str, payload: SubmissionIn, request: Request, db: DbSession):
    return _store(slug, payload, request, db)


@router.post("/{slug}/responses/partial", response_model=SubmissionOut)
async def submit_partial(slug: str, request: Request, db: DbSession):
    """Record an abandoned attempt, from a page that is going away.

    A separate endpoint because of one CORS rule. `navigator.sendBeacon` is the
    only request a browser reliably completes while unloading a page, and it
    cannot trigger a preflight — so its content type has to be one of the three
    CORS-safelisted values, none of which is `application/json`. Posting the
    same JSON as `text/plain` to the main endpoint fails validation, and
    loosening *that* endpoint to accept any content type would weaken the one
    route respondents' real answers arrive on.

    So: this route reads the body itself, whatever the beacon labelled it, and
    forces `is_complete=False`. It can never be used to record a completed
    response.
    """
    try:
        raw = await request.json()
    except ValueError as error:
        raise validation_error(
            AnswerValidationError(0, "That is not a valid submission.")
        ) from error

    try:
        payload = SubmissionIn.model_validate(raw)
    except ValidationError as error:
        raise validation_error(
            AnswerValidationError(0, "That is not a valid submission.")
        ) from error

    payload.is_complete = False
    return _store(slug, payload, request, db)
