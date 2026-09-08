"""Authoring surface — ``/api/forms/*``. Full access to drafts and responses."""

from fastapi import APIRouter, Query, Response, status
from fastapi.responses import StreamingResponse

from app.models import FormVersion
from app.routers.deps import DbSession, FormError, bad_request, not_found
from app.schemas import (
    FormCreate,
    FormOut,
    FormSummaryOut,
    FormSummaryStats,
    FormUpdate,
    FormVersionOut,
    QuestionCreate,
    QuestionOrderIn,
    QuestionOut,
    ResponsePage,
)
from app.services import forms as form_service
from app.services import questions as question_service
from app.services import responses as response_service
from app.services import versions as version_service

router = APIRouter(prefix="/api/forms", tags=["forms"])


@router.get("", response_model=list[FormSummaryOut])
def list_forms(db: DbSession, search: str | None = Query(default=None)):
    return form_service.list_forms(db, search)


@router.post("", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(payload: FormCreate, db: DbSession):
    return form_service.create_form(db, payload)


@router.get("/{form_id}", response_model=FormOut)
def get_form(form_id: int, db: DbSession):
    try:
        return form_service.get_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error


@router.patch("/{form_id}", response_model=FormOut)
def update_form(form_id: int, payload: FormUpdate, db: DbSession):
    try:
        return form_service.update_form(db, form_id, payload)
    except FormError as error:
        raise not_found(error) from error


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: DbSession):
    try:
        form_service.delete_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{form_id}/duplicate", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(form_id: int, db: DbSession):
    try:
        return form_service.duplicate_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error


@router.post("/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: int, db: DbSession):
    try:
        return form_service.publish_form(db, form_id)
    except FormError as error:
        raise (not_found if "not found" in str(error).lower() else bad_request)(error) from error


@router.post("/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form_id: int, db: DbSession):
    try:
        return form_service.unpublish_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error


@router.post("/{form_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(form_id: int, payload: QuestionCreate, db: DbSession):
    try:
        return question_service.add_question(db, form_id, payload)
    except FormError as error:
        raise not_found(error) from error


@router.put("/{form_id}/questions/order", response_model=FormOut)
def reorder_questions(form_id: int, payload: QuestionOrderIn, db: DbSession):
    try:
        return question_service.reorder_questions(db, form_id, payload.question_ids)
    except FormError as error:
        raise (not_found if "not found" in str(error).lower() else bad_request)(error) from error


@router.get("/{form_id}/responses", response_model=ResponsePage)
def list_responses(
    form_id: int,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
):
    try:
        return response_service.list_responses(db, form_id, page, page_size)
    except FormError as error:
        raise not_found(error) from error


@router.get("/{form_id}/summary", response_model=FormSummaryStats)
def summarize_form(form_id: int, db: DbSession):
    try:
        return response_service.summarize_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error


@router.get("/{form_id}/responses.csv")
def export_csv(form_id: int, db: DbSession):
    try:
        form = form_service.get_form(db, form_id)
    except FormError as error:
        raise not_found(error) from error

    filename = f"{form.slug or f'form-{form.id}'}-responses.csv"
    return StreamingResponse(
        response_service.export_responses_csv(db, form_id),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{form_id}/versions", response_model=list[FormVersionOut])
def list_versions(form_id: int, db: DbSession):
    """The form's history, newest first.

    The newest entry is flagged as current only when it still matches the form
    on disk; after an edit that has not yet been recorded — or on a form with no
    history at all — nothing is current, which is the honest answer.
    """
    try:
        form = form_service.load_form_or_raise(db, form_id)
    except FormError as error:
        raise not_found(error) from error

    current = version_service.snapshot_form(form)
    versions = version_service.list_versions(db, form_id)
    return [
        FormVersionOut(
            id=version.id,
            created_at=version.created_at,
            kind=version.kind,
            summary=version.summary,
            is_current=index == 0 and version.snapshot == current,
        )
        for index, version in enumerate(versions)
    ]


@router.post("/{form_id}/versions/{version_id}/restore", response_model=FormOut)
def restore_version(form_id: int, version_id: int, db: DbSession):
    """Roll the form back to one of its versions.

    The restore is itself recorded, so rolling back is undoable by rolling
    forward — a history you can fall out of would be worse than none.
    """
    try:
        form = form_service.load_form_or_raise(db, form_id)
    except FormError as error:
        raise not_found(error) from error

    version = db.get(FormVersion, version_id)
    if version is None or version.form_id != form_id:
        raise not_found(FormError("That version is not part of this form."))

    version_service.restore_version(db, form, version)
    version_service.record_version(db, form, kind="restore")
    return form_service.get_form(db, form_id)
