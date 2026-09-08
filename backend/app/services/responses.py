"""Submission intake, retrieval and per-question aggregation."""

import csv
import io
from collections.abc import Collection, Iterator
from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    CHOICE_TYPES,
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
    ValueCount,
    ResponseOut,
    ResponsePage,
    SubmissionIn,
    SubmissionOut,
)
from app.services.forms import FormClosedError, FormError, load_form_or_raise
from app.services.logic import next_question_id, path_taken
from app.services.validation import (
    DEFAULT_MAX_RATING,
    AnswerValidationError,
    validate_answer,
)

#: How many verbatims the summary shows for free-text questions.
TEXT_SAMPLE_LIMIT = 5

#: Question types whose summary is a list of recent answers rather than counts.
TEXT_TYPES = frozenset(
    {QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL}
)


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
    # Checked here rather than only in the client: a closed form must refuse a
    # submission that arrives from a stale tab or straight from curl.
    if not form.accepting_responses:
        raise FormClosedError("This form is no longer accepting responses.")

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

    # A completed submission must satisfy every required question the respondent
    # was actually shown. Branching makes that a smaller set than "every required
    # question": a question on a path not taken was never asked, so demanding it
    # would make any branched form impossible to submit. The path is recomputed
    # here from the answers rather than trusted from the client.
    if payload.is_complete:
        order = [q for q in form.live_questions if not q.is_ending]
        raw = {item.question_id: item.value for item in payload.answers}
        asked = set(path_taken(order, raw))
        for question in live.values():
            if question.required and question.id in asked and question.id not in seen:
                raise AnswerValidationError(question.id, "This field is required.")

    db.add(response)
    db.commit()

    raw = {item.question_id: item.value for item in payload.answers}
    ending = resolve_ending(form, raw)
    return SubmissionOut(
        response_id=response.id,
        ending=_ending_payload(ending) if ending else None,
    )


def resolve_ending(form: Form, answers: dict[int, object]) -> Question | None:
    """The ending a respondent lands on, following the same rules the flow does."""
    order = [q for q in form.live_questions if not q.is_ending]
    endings = [q for q in form.live_questions if q.is_ending]
    if not endings:
        return None
    if not order:
        return endings[0]

    by_id = {q.id: q for q in form.live_questions}
    path = path_taken(order, answers)
    if path:
        last = by_id[path[-1]]
        target = next_question_id(last, answers.get(last.id), order + endings)
        if target is not None and by_id.get(target) in endings:
            return by_id[target]
    return endings[0]


def _ending_payload(ending: Question) -> dict:
    """The ending block to show, as data rather than a hardcoded screen."""
    return {
        "id": ending.id,
        "title": ending.title,
        "description": ending.description,
        "settings": ending.settings or {},
    }


def _raw_value(answer: Answer) -> object:
    """The answer as the logic rules expect it, back out of its typed columns."""
    if answer.option_ids is not None:
        return answer.option_ids
    if answer.bool_value is not None:
        return answer.bool_value
    if answer.number_value is not None:
        return answer.number_value
    return answer.text_value


def _to_out(form: Form, response: Response) -> ResponseOut:
    """One submission, plus the ending it reached.

    The ending is derived rather than stored. Storing it would be a second copy
    of something the rules already determine, and it would go stale the moment
    an author edited them — which is the trap `question_title` snapshots exist
    to avoid for answers, and the opposite call is right here: an ending is a
    property of the current rule set, not of the moment the answer was given.
    """
    raw = {answer.question_id: _raw_value(answer) for answer in response.answers}
    ending = resolve_ending(form, raw)
    return ResponseOut.model_validate(response).model_copy(
        update={"ending_title": ending.title if ending else None}
    )


def list_responses(
    db: Session,
    form_id: int,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    sort: str = "newest",
) -> ResponsePage:
    """A page of a form's submissions.

    ``search`` matches the rendered text of any answer, which is why
    ``display_value`` is denormalised onto the row: one ILIKE over one column
    finds "Cricket" whether it was typed, picked from a list or rated.
    """
    form = load_form_or_raise(db, form_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    where = [Response.form_id == form_id]
    term = (search or "").strip()
    if term:
        where.append(
            select(Answer.id)
            .where(
                Answer.response_id == Response.id,
                Answer.display_value.ilike(f"%{term}%"),
            )
            .exists()
        )

    total = db.scalar(select(func.count(Response.id)).where(*where)) or 0

    order = (
        Response.started_at.asc() if sort == "oldest" else Response.started_at.desc()
    )
    items = db.scalars(
        select(Response)
        .where(*where)
        .options(selectinload(Response.answers))
        .order_by(order, Response.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ResponsePage(
        items=[_to_out(form, response) for response in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def delete_responses(db: Session, form_id: int, response_ids: list[int]) -> int:
    """Delete submissions from one form. Returns how many actually went.

    Scoped to the form on purpose: the IDs arrive from a checkbox column, and a
    stale page must not be able to delete another form's data by guessing.
    """
    if not response_ids:
        return 0
    load_form_or_raise(db, form_id)

    doomed = db.scalars(
        select(Response).where(
            Response.form_id == form_id, Response.id.in_(response_ids)
        )
    ).all()
    for response in doomed:
        db.delete(response)
    db.commit()
    return len(doomed)


def get_response(db: Session, response_id: int) -> Response:
    response = db.get(
        Response, response_id, options=[selectinload(Response.answers)]
    )
    if response is None:
        raise FormError("Response not found.")
    return response


def summarize_form(db: Session, form_id: int) -> FormSummaryStats:
    """Per-question aggregates for a whole form.

    Every statistic is gathered in one pass per *kind* of question rather than
    one pass per question. That matters because the production database is
    SQLite over HTTP: each statement is a network round trip, so a form with a
    handful of questions was costing nineteen of them.

    This is what the typed answer columns buy — ratings and numbers reduce to
    ``AVG``/``MIN``/``MAX`` and yes/no to a ``GROUP BY``, both grouped across
    every question at once. Multi-select is the documented exception: its
    ``option_ids`` is a JSON array, so the rows are fetched once and tallied
    here rather than joined against an options table this schema does not have.
    """
    form = load_form_or_raise(db, form_id)
    questions = [q for q in form.live_questions if not q.is_ending]

    total, completed = db.execute(
        select(
            func.count(Response.id),
            func.coalesce(func.sum(case((Response.is_complete.is_(True), 1), else_=0)), 0),
        ).where(Response.form_id == form_id)
    ).one()

    by_id = {q.id: q for q in questions}
    ids = list(by_id)
    if not ids:
        return FormSummaryStats(
            form_id=form_id,
            total_responses=total or 0,
            completed_responses=completed or 0,
            completion_rate=round((completed or 0) / total, 4) if total else 0.0,
            questions=[],
        )

    answered = _answered_counts(db, ids)
    numeric_ids = _ids_of(questions, {QuestionType.RATING, QuestionType.NUMBER})
    numeric = _numeric_stats(db, numeric_ids)
    spread = _numeric_distribution(db, numeric_ids)
    booleans = _yes_no_counts(db, _ids_of(questions, {QuestionType.YES_NO}))
    chosen = _choice_counts(db, _ids_of(questions, CHOICE_TYPES))
    samples = _text_samples(db, _ids_of(questions, TEXT_TYPES))

    stats = []
    for question in questions:
        qtype = QuestionType(question.type)
        entry = QuestionStats(
            question_id=question.id,
            title=question.title,
            type=qtype,
            answered=answered.get(question.id, 0),
        )

        if qtype in {QuestionType.RATING, QuestionType.NUMBER}:
            average, low, high = numeric.get(question.id, (None, None, None))
            entry.average = round(average, 2) if average is not None else None
            entry.minimum = low
            entry.maximum = high
            entry.distribution = _buckets(question, qtype, spread.get(question.id, {}))
        elif qtype is QuestionType.YES_NO:
            counts = booleans.get(question.id, {})
            entry.choices = [
                ChoiceCount(label="Yes", count=counts.get(True, 0)),
                ChoiceCount(label="No", count=counts.get(False, 0)),
            ]
        elif qtype in CHOICE_TYPES:
            tally = chosen.get(question.id, {})
            entry.choices = [
                ChoiceCount(label=option.label, count=tally.get(option.id, 0))
                for option in question.options
            ]
        else:
            entry.samples = samples.get(question.id, [])

        stats.append(entry)

    return FormSummaryStats(
        form_id=form_id,
        total_responses=total or 0,
        completed_responses=completed or 0,
        completion_rate=round((completed or 0) / total, 4) if total else 0.0,
        questions=stats,
    )


def _ids_of(questions: list[Question], types: Collection[QuestionType]) -> list[int]:
    return [q.id for q in questions if QuestionType(q.type) in types]


def _answered_counts(db: Session, ids: list[int]) -> dict[int, int]:
    rows = db.execute(
        select(Answer.question_id, func.count(Answer.id))
        .where(Answer.question_id.in_(ids))
        .group_by(Answer.question_id)
    ).all()
    return {question_id: count for question_id, count in rows}


def _numeric_stats(
    db: Session, ids: list[int]
) -> dict[int, tuple[float | None, float | None, float | None]]:
    if not ids:
        return {}
    rows = db.execute(
        select(
            Answer.question_id,
            func.avg(Answer.number_value),
            func.min(Answer.number_value),
            func.max(Answer.number_value),
        )
        .where(Answer.question_id.in_(ids))
        .group_by(Answer.question_id)
    ).all()
    return {question_id: (avg, low, high) for question_id, avg, low, high in rows}


def _numeric_distribution(db: Session, ids: list[int]) -> dict[int, dict[float, int]]:
    """How many answers landed on each value, for every numeric question at once."""
    if not ids:
        return {}
    rows = db.execute(
        select(Answer.question_id, Answer.number_value, func.count(Answer.id))
        .where(Answer.question_id.in_(ids), Answer.number_value.is_not(None))
        .group_by(Answer.question_id, Answer.number_value)
    ).all()
    spread: dict[int, dict[float, int]] = {}
    for question_id, value, count in rows:
        spread.setdefault(question_id, {})[float(value)] = count
    return spread


def _buckets(
    question: Question, qtype: QuestionType, counts: dict[float, int]
) -> list[ValueCount]:
    """The distribution as bars.

    A rating gets every step of its scale, empty ones included: "nobody gave us
    a 1" is worth seeing, and a histogram with the gaps closed up would hide it.
    A number question has no scale to fill in, so it reports only the values
    that were actually answered.
    """
    if qtype is QuestionType.RATING:
        top = int((question.settings or {}).get("max_rating", DEFAULT_MAX_RATING))
        return [
            ValueCount(value=float(step), count=counts.get(float(step), 0))
            for step in range(1, max(top, 1) + 1)
        ]
    return [
        ValueCount(value=value, count=counts[value]) for value in sorted(counts)
    ]


def _yes_no_counts(db: Session, ids: list[int]) -> dict[int, dict[bool, int]]:
    if not ids:
        return {}
    rows = db.execute(
        select(Answer.question_id, Answer.bool_value, func.count(Answer.id))
        .where(Answer.question_id.in_(ids), Answer.bool_value.is_not(None))
        .group_by(Answer.question_id, Answer.bool_value)
    ).all()
    counts: dict[int, dict[bool, int]] = {}
    for question_id, value, count in rows:
        counts.setdefault(question_id, {})[bool(value)] = count
    return counts


def _choice_counts(db: Session, ids: list[int]) -> dict[int, dict[int, int]]:
    """Tally selected option IDs.

    ``option_ids`` holds a JSON array because a multi-select answer is genuinely
    multi-valued, so there is nothing for SQL to group on. One query brings back
    the selections and they are counted here — cheaper than the per-option
    ``LIKE`` scans this replaced, which cost a round trip each.
    """
    if not ids:
        return {}
    rows = db.execute(
        select(Answer.question_id, Answer.option_ids).where(
            Answer.question_id.in_(ids), Answer.option_ids.is_not(None)
        )
    ).all()
    counts: dict[int, dict[int, int]] = {}
    for question_id, option_ids in rows:
        tally = counts.setdefault(question_id, {})
        for option_id in option_ids or []:
            tally[option_id] = tally.get(option_id, 0) + 1
    return counts


def _text_samples(db: Session, ids: list[int]) -> dict[int, list[str]]:
    """The most recent verbatims per question, ranked in the database."""
    if not ids:
        return {}
    ranked = (
        select(
            Answer.question_id,
            Answer.display_value,
            func.row_number()
            .over(partition_by=Answer.question_id, order_by=Answer.id.desc())
            .label("rank"),
        )
        .where(Answer.question_id.in_(ids), Answer.display_value != "")
        .subquery()
    )
    rows = db.execute(
        select(ranked.c.question_id, ranked.c.display_value).where(
            ranked.c.rank <= TEXT_SAMPLE_LIMIT
        )
    ).all()
    samples: dict[int, list[str]] = {}
    for question_id, value in rows:
        samples.setdefault(question_id, []).append(value)
    return samples


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
