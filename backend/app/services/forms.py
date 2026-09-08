"""Form-level operations: creation, publishing, duplication and deletion."""

import secrets
import re
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Form,
    FormSlugAlias,
    FormStatus,
    Question,
    QuestionOption,
    Response,
)
from app.schemas import FormCreate, FormOut, FormSummaryOut, FormUpdate
from app.services.logic import LogicError, assert_no_cycles
from app.services.versions import record_version

SLUG_SUFFIX_LENGTH = 6
_SLUG_CLEAN_RE = re.compile(r"[^a-z0-9]+")


class FormError(Exception):
    """A form operation that is invalid for the form's current state."""


def _slugify(title: str) -> str:
    base = _SLUG_CLEAN_RE.sub("-", title.lower()).strip("-")[:40].strip("-")
    return base or "form"


def _unique_slug(db: Session, title: str) -> str:
    """A readable slug plus a short random suffix.

    The suffix does the uniqueness work, so two forms may share a title, and it
    also stops anyone enumerating published forms by guessing titles.
    """
    base = _slugify(title)
    while True:
        candidate = f"{base}-{secrets.token_hex(SLUG_SUFFIX_LENGTH // 2)}"
        # Retired slugs count as taken. A link must only ever resolve to the
        # form it was minted for, so one can never be handed to a second form.
        taken = db.scalar(
            select(Form.id).where(Form.slug == candidate)
        ) or db.scalar(
            select(FormSlugAlias.form_id).where(FormSlugAlias.slug == candidate)
        )
        if not taken:
            return candidate


def load_form_or_raise(db: Session, form_id: int) -> Form:
    """Load a form with its questions and options eagerly attached.

    ``populate_existing`` forces the identity-mapped instance and its collections
    to be refreshed. Without it, a form loaded earlier in the same session would
    keep a stale question list after another service appended a row.
    """
    form = db.scalar(
        select(Form)
        .where(Form.id == form_id)
        .options(selectinload(Form.questions).selectinload(Question.options),
            selectinload(Form.questions).selectinload(Question.rules))
        .execution_options(populate_existing=True)
    )
    if form is None:
        raise FormError("Form not found.")
    return form


def get_form(db: Session, form_id: int) -> FormOut:
    """The builder's view of a form: live questions only, soft-deleted ones hidden."""
    form = load_form_or_raise(db, form_id)
    return to_form_out(form)


def to_form_out(form: Form) -> FormOut:
    return FormOut.model_validate(
        {
            **{c.name: getattr(form, c.name) for c in Form.__table__.columns},
            # A form saved before settings existed has none; the defaults are
            # "everything shown", which is how it already behaved.
            "settings": form.settings or {},
            "questions": form.live_questions,
        }
    )


def list_forms(db: Session, search: str | None = None) -> list[FormSummaryOut]:
    """Dashboard rows: each form with its live question and response counts.

    Counts are computed as correlated subqueries so the dashboard is one round
    trip rather than one query per row.
    """
    question_count = (
        select(func.count(Question.id))
        .where(Question.form_id == Form.id, Question.deleted_at.is_(None))
        .scalar_subquery()
    )
    response_count = (
        select(func.count(Response.id))
        .where(Response.form_id == Form.id)
        .scalar_subquery()
    )
    completed_count = (
        select(func.count(Response.id))
        .where(Response.form_id == Form.id, Response.is_complete.is_(True))
        .scalar_subquery()
    )

    stmt = select(Form, question_count, response_count, completed_count)
    if search:
        stmt = stmt.where(Form.title.ilike(f"%{search}%"))
    stmt = stmt.order_by(Form.updated_at.desc())

    return [
        FormSummaryOut(
            **{
                c.name: getattr(form, c.name)
                for c in Form.__table__.columns
                if c.name in FormSummaryOut.model_fields
            },
            question_count=questions,
            response_count=responses,
            completed_count=completed,
        )
        for form, questions, responses, completed in db.execute(stmt).all()
    ]


def create_form(db: Session, payload: FormCreate) -> FormOut:
    """Create an empty draft with one ending block, the way the real app does."""
    form = Form(title=payload.title, status=FormStatus.DRAFT)
    form.questions.append(
        Question(
            type="ending",
            title="Thanks for completing this typeform!",
            description="Now create your own — it's free, easy & beautiful.",
            position=0,
            required=False,
            settings={"button_text": "Create a typeform"},
        )
    )
    db.add(form)
    db.commit()
    return get_form(db, form.id)


def update_form(db: Session, form_id: int, payload: FormUpdate) -> FormOut:
    """Apply a partial update. This is what the builder's autosave calls.

    Renaming a form that already has a slug re-mints it, so the public link
    reads like the form's current name rather than the name it happened to have
    when it was first published.

    The cost is real and worth stating: the previous link stops working. There
    is no redirect from the old slug, so anything already shared — a message, a
    QR code, an email — points at a 404 after a rename. Keeping both alive would
    need a table of retired slugs, which is not built.
    """
    form = load_form_or_raise(db, form_id)
    data = payload.model_dump(exclude_unset=True)
    renamed = "title" in data and data["title"] != form.title

    for field, value in data.items():
        setattr(form, field, value)

    if renamed and form.slug:
        # Retire the old link rather than dropping it, so everything already
        # shared still resolves — the public route redirects it to the new one.
        db.merge(FormSlugAlias(slug=form.slug, form_id=form.id))
        form.slug = _unique_slug(db, form.title)

    db.commit()
    record_version(db, form)
    return get_form(db, form_id)


class FormClosedError(Exception):
    """The form exists and is published, but its creator has stopped it."""


def delete_form(db: Session, form_id: int) -> None:
    """Delete a form; questions, options, responses and answers cascade."""
    form = load_form_or_raise(db, form_id)
    db.delete(form)
    db.commit()


def publish_form(db: Session, form_id: int) -> FormOut:
    """Make a form publicly fillable.

    Invariants: a form with no answerable question cannot be published, and a
    slug is minted once and then reused forever so a shared link survives an
    unpublish/republish cycle.
    """
    form = load_form_or_raise(db, form_id)
    answerable = [q for q in form.live_questions if not q.is_ending]
    if not answerable:
        raise FormError("Add at least one question before publishing.")

    # Rules can also break by deletion or reordering, not only by editing, so
    # publishing re-checks rather than trusting the write-time check alone.
    try:
        assert_no_cycles(form.live_questions)
    except LogicError as error:
        raise FormError(str(error)) from error

    if not form.slug:
        form.slug = _unique_slug(db, form.title)
    form.status = FormStatus.PUBLISHED
    form.published_at = datetime.now(timezone.utc)
    db.commit()
    record_version(db, form, kind="publish")
    return get_form(db, form_id)


def unpublish_form(db: Session, form_id: int) -> FormOut:
    """Take a form offline. The slug is retained deliberately — see above."""
    form = load_form_or_raise(db, form_id)
    form.status = FormStatus.DRAFT
    db.commit()
    record_version(db, form, kind="unpublish")
    return get_form(db, form_id)


def duplicate_form(db: Session, form_id: int) -> FormOut:
    """Deep-copy a form's live questions and options into a fresh draft.

    Responses are never copied, and the copy gets no slug: it is a new draft
    that must be published on its own.
    """
    source = load_form_or_raise(db, form_id)
    copy = Form(
        title=f"{source.title} (copy)",
        status=FormStatus.DRAFT,
        welcome_screen=source.welcome_screen,
        theme=source.theme,
    )
    for question in source.live_questions:
        cloned = Question(
            type=question.type,
            title=question.title,
            description=question.description,
            required=question.required,
            position=question.position,
            settings=question.settings,
        )
        cloned.options = [
            QuestionOption(label=o.label, position=o.position) for o in question.options
        ]
        copy.questions.append(cloned)

    db.add(copy)
    db.commit()
    return get_form(db, copy.id)


def get_published_form(db: Session, slug: str) -> Form:
    """Resolve a public slug to a published form, or raise.

    A draft is indistinguishable from a missing form here on purpose: the public
    surface must not leak the existence of unpublished work.

    A slug the form used to answer on resolves too. Renaming re-mints the link,
    and everything already shared still points at the old one — so the retired
    slug is looked up as a fallback, and the form comes back carrying its
    *current* slug, which is what lets the public page redirect to it.

    The fallback costs a second query only on the miss, so a live link is still
    one round trip.
    """
    def published(where):
        return db.scalar(
            select(Form)
            .where(where, Form.status == FormStatus.PUBLISHED)
            .options(
                selectinload(Form.questions).selectinload(Question.options),
                selectinload(Form.questions).selectinload(Question.rules),
            )
            .execution_options(populate_existing=True)
        )

    form = published(Form.slug == slug)
    if form is None:
        retired = db.scalar(
            select(FormSlugAlias.form_id).where(FormSlugAlias.slug == slug)
        )
        if retired is not None:
            form = published(Form.id == retired)
    if form is None:
        raise FormError("Form not found.")
    return form
