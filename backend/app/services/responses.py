"""Submission intake, retrieval and per-question aggregation."""

import csv
import io
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Answer,
    Form,
    Question,
    QuestionType,
    Response,
)
from app.schemas import (
    ChoiceCount,
    FormSummaryStats,
    QuestionStats,
    ResponsePage,
    SubmissionIn,
    SubmissionOut,
)
from app.services.forms import FormError, load_form_or_raise
from app.services.validation import AnswerValidationError, validate_answer

#: How many verbatims the summary shows for free-text questions.
TEXT_SAMPLE_LIMIT = 5


def submit_response(db: Session, form: Form, payload: SubmissionIn) -> SubmissionOut:
    """Validate, snapshot and store one submission.

    Two invariants make this the most important function in the backend:

    * Every answer is re-validated server-side against the question it claims to
      answer, and an answer naming a question that is not on this form is
      rejected outright.
    * Each stored answer carries a snapshot of the question's title and type, so
      later edits or deletions of the question cannot rewrite history.

    ``is_complete=False`` records a partial response — a respondent who dropped
    out — which is what makes the dashboard's completion rate meaningful.
    """
    live = {q.id: q for q in form.live_questions if not q.is_ending}

    now = datetime.now(timezone.utc)
    response = Response(
        form_id=form.id,
        started_at=now,
        submitted_at=now if payload.is_complete else None,
        is_complete=payload.is_complete,
        meta=payload.meta,
    )

    seen: set[int] = set()
    for item in payload.answers:
        question = live.get(item.question_id)
        if question is None:
            raise AnswerValidationError(
                item.question_id, "That question is not part of this form."
            )
        if question.id in seen:
            raise AnswerValidationError(question.id, "Duplicate answer.")
        seen.add(question.id)

        typed = validate_answer(question, item.value)
        if typed.is_empty:
            continue

        response.answers.append(
            Answer(
                question_id=question.id,
                question_title=question.title,
                question_type=question.type,
                text_value=typed.text_value,
                number_value=typed.number_value,
                bool_value=typed.bool_value,
                option_ids=typed.option_ids,
                display_value=typed.display_value,
            )
        )

    # A completed submission must satisfy every required question, including the
    # ones the client never sent at all.
    if payload.is_complete:
        for question in live.values():
            if question.required and question.id not in seen:
                raise AnswerValidationError(question.id, "This field is required.")

    db.add(response)
    db.commit()

    return SubmissionOut(response_id=response.id, ending=_ending_payload(form))


def _ending_payload(form: Form) -> dict | None:
    """The ending block to show, as data rather than a hardcoded screen."""
    endings = [q for q in form.live_questions if q.is_ending]
    if not endings:
        return None
    ending = endings[0]
    return {
        "id": ending.id,
        "title": ending.title,
        "description": ending.description,
        "settings": ending.settings or {},
    }


def list_responses(
    db: Session, form_id: int, page: int = 1, page_size: int = 25
) -> ResponsePage:
    """A page of a form's submissions, newest first."""
    load_form_or_raise(db, form_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    total = db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form_id)
    ) or 0

    items = db.scalars(
        select(Response)
        .where(Response.form_id == form_id)
        .options(selectinload(Response.answers))
        .order_by(Response.started_at.desc(), Response.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ResponsePage(items=list(items), total=total, page=page, page_size=page_size)


def get_response(db: Session, response_id: int) -> Response:
    response = db.get(
        Response, response_id, options=[selectinload(Response.answers)]
    )
    if response is None:
        raise FormError("Response not found.")
    return response


def summarize_form(db: Session, form_id: int) -> FormSummaryStats:
    """Per-question aggregates, computed by the database.

    This is what the typed answer columns buy: choice counts are a ``GROUP BY``
    over ``option_ids`` membership, and rating/number statistics are ``AVG``,
    ``MIN`` and ``MAX`` over ``number_value`` — no deserialising rows in Python.
    """
    form = load_form_or_raise(db, form_id)

    total = db.scalar(
        select(func.count(Response.id)).where(Response.form_id == form_id)
    ) or 0
    completed = db.scalar(
        select(func.count(Response.id)).where(
            Response.form_id == form_id, Response.is_complete.is_(True)
        )
    ) or 0

    stats = [
        _question_stats(db, question)
        for question in form.live_questions
        if not question.is_ending
    ]

    return FormSummaryStats(
        form_id=form_id,
        total_responses=total,
        completed_responses=completed,
        completion_rate=round(completed / total, 4) if total else 0.0,
        questions=stats,
    )


def _question_stats(db: Session, question: Question) -> QuestionStats:
    qtype = QuestionType(question.type)
    answered = db.scalar(
        select(func.count(Answer.id)).where(Answer.question_id == question.id)
    ) or 0

    base = QuestionStats(
        question_id=question.id,
        title=question.title,
        type=qtype,
        answered=answered,
    )

    if qtype in {QuestionType.RATING, QuestionType.NUMBER}:
        avg, low, high = db.execute(
            select(
                func.avg(Answer.number_value),
                func.min(Answer.number_value),
                func.max(Answer.number_value),
            ).where(Answer.question_id == question.id)
        ).one()
        base.average = round(avg, 2) if avg is not None else None
        base.minimum = low
        base.maximum = high

    elif qtype is QuestionType.YES_NO:
        rows = db.execute(
            select(Answer.bool_value, func.count(Answer.id))
            .where(Answer.question_id == question.id)
            .group_by(Answer.bool_value)
        ).all()
        counts = {bool(value): count for value, count in rows if value is not None}
        base.choices = [
            ChoiceCount(label="Yes", count=counts.get(True, 0)),
            ChoiceCount(label="No", count=counts.get(False, 0)),
        ]

    elif qtype in {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}:
        # option_ids is a JSON array, so membership is a LIKE over the stored
        # text. At option-list scale that is one indexed scan per option and far
        # cheaper than pulling every answer row into Python.
        base.choices = [
            ChoiceCount(
                label=option.label,
                count=db.scalar(
                    select(func.count(Answer.id)).where(
                        Answer.question_id == question.id,
                        func.replace(func.replace(Answer.option_ids, "[", ","), "]", ",").like(
                            f"%,{option.id},%"
                        ),
                    )
                )
                or 0,
            )
            for option in question.options
        ]

    else:
        base.samples = list(
            db.scalars(
                select(Answer.display_value)
                .where(Answer.question_id == question.id, Answer.display_value != "")
                .order_by(Answer.id.desc())
                .limit(TEXT_SAMPLE_LIMIT)
            ).all()
        )

    return base


def export_responses_csv(db: Session, form_id: int) -> Iterator[str]:
    """Stream a form's responses as CSV: one row per response, one column per question.

    Cells come straight from ``display_value``, which is exactly why that
    denormalised column exists.
    """
    form = load_form_or_raise(db, form_id)
    questions = [q for q in form.live_questions if not q.is_ending]

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    def flush() -> str:
        value = buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
        return value

    writer.writerow(
        ["Response ID", "Submitted at", "Complete", *(q.title for q in questions)]
    )
    yield flush()

    responses = db.scalars(
        select(Response)
        .where(Response.form_id == form_id)
        .options(selectinload(Response.answers))
        .order_by(Response.id)
    )
    for response in responses:
        by_question = {a.question_id: a.display_value for a in response.answers}
        writer.writerow(
            [
                response.id,
                response.submitted_at.isoformat() if response.submitted_at else "",
                "yes" if response.is_complete else "no",
                *(by_question.get(q.id, "") for q in questions),
            ]
        )
        yield flush()
