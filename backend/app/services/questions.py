"""Question-level operations: append, edit, soft-delete and reorder."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    CHOICE_TYPES,
    Question,
    QuestionOption,
    QuestionRule,
    QuestionType,
)
from app.schemas import FormOut, QuestionCreate, QuestionUpdate, RuleIn
from app.services.forms import FormError, get_form, load_form_or_raise
from app.services.logic import LogicError, assert_no_cycles
from app.services.versions import record_version

#: Sensible starting options so a fresh choice block is immediately editable.
DEFAULT_CHOICE_LABELS = ["Option 1", "Option 2", "Option 3"]


class QuestionError(Exception):
    """A question operation that is invalid for the question's current state."""


def _load_question(db: Session, question_id: int) -> Question:
    question = db.scalar(
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.options), selectinload(Question.rules))
        .execution_options(populate_existing=True)
    )
    if question is None or question.deleted_at is not None:
        raise QuestionError("Question not found.")
    return question


def _replace_options(question: Question, labels: list[str]) -> None:
    """Rewrite a question's option list, renumbering positions from zero."""
    question.options.clear()
    question.options.extend(
        QuestionOption(label=label, position=index)
        for index, label in enumerate(labels)
    )


def add_question(db: Session, form_id: int, payload: QuestionCreate) -> Question:
    """Append a block to a form at ``max(position) + 1``.

    Endings are appended like any other block; the flow renders them last
    because they sort last, not because of a special case.
    """
    form = load_form_or_raise(db, form_id)
    next_position = (
        db.scalar(
            select(func.coalesce(func.max(Question.position), -1) + 1).where(
                Question.form_id == form.id
            )
        )
        or 0
    )

    question = Question(
        form_id=form.id,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        required=payload.required,
        position=next_position,
        settings=payload.settings,
    )
    if payload.options is not None:
        _replace_options(question, [o.label for o in payload.options])
    elif payload.type in CHOICE_TYPES:
        _replace_options(question, DEFAULT_CHOICE_LABELS)

    db.add(question)
    db.commit()
    record_version(db, load_form_or_raise(db, form_id))
    return _load_question(db, question.id)


def update_question(
    db: Session, question_id: int, payload: QuestionUpdate
) -> Question:
    """Apply a partial update, including changing the block's type in place.

    Changing type is supported because nothing about a question's identity
    depends on it — the type lives in a column, and answers already carry their
    own snapshot of the type they were collected under.
    """
    question = _load_question(db, question_id)
    data = payload.model_dump(exclude_unset=True)
    options = data.pop("options", None)

    for field, value in data.items():
        setattr(question, field, value)

    if options is not None:
        _replace_options(question, [o["label"] for o in options])
    elif "type" in data and QuestionType(question.type) in CHOICE_TYPES and not question.options:
        _replace_options(question, DEFAULT_CHOICE_LABELS)

    db.commit()
    record_version(db, load_form_or_raise(db, question.form_id))
    return _load_question(db, question_id)


def delete_question(db: Session, question_id: int) -> None:
    """Soft-delete a question.

    The row stays so that every historical ``answers.question_id`` still points
    at a real question. The builder and the public form filter on
    ``deleted_at IS NULL``; the results view reads per-answer snapshots and so
    is unaffected either way.
    """
    question = _load_question(db, question_id)
    question.deleted_at = datetime.now(timezone.utc)
    db.commit()
    record_version(db, load_form_or_raise(db, question.form_id))


def reorder_questions(db: Session, form_id: int, question_ids: list[int]) -> FormOut:
    """Rewrite every position from a complete ordered ID array, in one transaction.

    Invariant: the array must be exactly the form's live question IDs. Rejecting
    a partial array is what keeps positions dense and gap-free, which is why
    integer positions are safe here at all.
    """
    form = load_form_or_raise(db, form_id)
    live = {q.id: q for q in form.live_questions}

    if sorted(question_ids) != sorted(live.keys()):
        raise FormError("The order must list every question in this form exactly once.")

    for position, question_id in enumerate(question_ids):
        live[question_id].position = position

    db.commit()
    record_version(db, form)
    return get_form(db, form_id)


def set_rules(db: Session, question_id: int, rules: list[RuleIn]) -> Question:
    """Replace a question's branching rules, refusing any set that loops.

    Rejecting a cycle at write time rather than at publish is deliberate: the
    author finds out while looking at the rule they just wrote, not minutes
    later on a different screen.
    """
    question = _load_question(db, question_id)
    form = load_form_or_raise(db, question.form_id)
    live = {q.id for q in form.live_questions}

    for rule in rules:
        if rule.target_question_id not in live:
            raise QuestionError("That rule points at a block which is not in this form.")
        if rule.target_question_id == question_id:
            raise QuestionError("A rule cannot jump to the question it belongs to.")

    question.rules.clear()
    question.rules.extend(
        QuestionRule(
            position=index,
            operator=rule.operator,
            value=rule.value,
            target_question_id=rule.target_question_id,
        )
        for index, rule in enumerate(rules)
    )
    db.flush()

    try:
        assert_no_cycles(load_form_or_raise(db, question.form_id).live_questions)
    except LogicError as error:
        db.rollback()
        raise QuestionError(str(error)) from error

    db.commit()
    record_version(db, load_form_or_raise(db, question.form_id))
    return _load_question(db, question_id)
