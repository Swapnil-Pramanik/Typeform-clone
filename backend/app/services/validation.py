"""The single source of truth for what a valid answer looks like.

Every rule below is mirrored — in *rules*, not in code — by
``frontend/src/lib/validation.ts``, which gives the respondent instant inline
feedback. The two runtimes must agree, so the rules are stated once here and
that file carries a pointer back to this module.

Rules by question type
----------------------
short_text   non-empty string; <= ``settings.max_length`` (default 200)
long_text    non-empty string; <= ``settings.max_length`` (default 2000)
email        non-empty string matching ``EMAIL_RE``
number       finite number; within ``settings.min`` / ``settings.max`` if set
yes_no       boolean
rating       integer in 1..``settings.max_rating`` (default 5)
multiple_choice  one option ID, or many when ``settings.multi_select`` is set;
                 every ID must belong to this question
dropdown     exactly one option ID belonging to this question

Emptiness is checked before type rules: a blank answer to an optional question
is valid and stores nothing; a blank answer to a required question raises.
"""

import math
import re
from dataclasses import dataclass, field
from typing import Any

from app.models import Question, QuestionType

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$")

DEFAULT_MAX_RATING = 5
DEFAULT_SHORT_TEXT_MAX = 200
DEFAULT_LONG_TEXT_MAX = 2000


class AnswerValidationError(ValueError):
    """Raised when a submitted answer breaks the rules for its question."""

    def __init__(self, question_id: int, message: str) -> None:
        self.question_id = question_id
        self.message = message
        super().__init__(message)


@dataclass
class TypedValue:
    """A validated answer, already split into the columns ``answers`` stores."""

    text_value: str | None = None
    number_value: float | None = None
    bool_value: bool | None = None
    option_ids: list[int] | None = None
    display_value: str = ""
    is_empty: bool = False

    @classmethod
    def empty(cls) -> "TypedValue":
        return cls(is_empty=True)


def _settings(question: Question) -> dict[str, Any]:
    return question.settings or {}


def _is_blank(raw: Any) -> bool:
    if raw is None:
        return True
    if isinstance(raw, str):
        return raw.strip() == ""
    if isinstance(raw, (list, tuple)):
        return len(raw) == 0
    return False


def validate_answer(question: Question, raw: Any) -> TypedValue:
    """Validate one raw answer and split it into typed columns.

    Raises ``AnswerValidationError`` if the value breaks the rules for
    ``question.type``. Returns ``TypedValue.empty()`` when an optional question
    was skipped — the caller stores no row in that case.
    """
    if question.type == QuestionType.ENDING:
        return TypedValue.empty()

    if _is_blank(raw):
        if question.required:
            raise AnswerValidationError(question.id, "This field is required.")
        return TypedValue.empty()

    handler = _HANDLERS.get(QuestionType(question.type))
    if handler is None:
        raise AnswerValidationError(
            question.id, f"Unsupported question type '{question.type}'."
        )
    return handler(question, raw)


# --- per-type handlers -------------------------------------------------------


def _text(question: Question, raw: Any, default_max: int) -> TypedValue:
    if not isinstance(raw, str):
        raise AnswerValidationError(question.id, "Expected text.")
    value = raw.strip()
    max_length = int(_settings(question).get("max_length", default_max))
    if len(value) > max_length:
        raise AnswerValidationError(
            question.id, f"Please keep this under {max_length} characters."
        )
    return TypedValue(text_value=value, display_value=value)


def _short_text(question: Question, raw: Any) -> TypedValue:
    return _text(question, raw, DEFAULT_SHORT_TEXT_MAX)


def _long_text(question: Question, raw: Any) -> TypedValue:
    return _text(question, raw, DEFAULT_LONG_TEXT_MAX)


def _email(question: Question, raw: Any) -> TypedValue:
    if not isinstance(raw, str):
        raise AnswerValidationError(question.id, "Expected an email address.")
    value = raw.strip()
    if not EMAIL_RE.match(value):
        raise AnswerValidationError(question.id, "Enter a valid email address.")
    return TypedValue(text_value=value, display_value=value)


def _number(question: Question, raw: Any) -> TypedValue:
    if isinstance(raw, bool):
        raise AnswerValidationError(question.id, "Enter a number.")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise AnswerValidationError(question.id, "Enter a number.") from None
    if math.isnan(value) or math.isinf(value):
        raise AnswerValidationError(question.id, "Enter a number.")

    settings = _settings(question)
    minimum, maximum = settings.get("min"), settings.get("max")
    if minimum is not None and value < float(minimum):
        raise AnswerValidationError(question.id, f"Must be at least {minimum}.")
    if maximum is not None and value > float(maximum):
        raise AnswerValidationError(question.id, f"Must be at most {maximum}.")

    display = str(int(value)) if value.is_integer() else str(value)
    return TypedValue(number_value=value, display_value=display)


def _yes_no(question: Question, raw: Any) -> TypedValue:
    if isinstance(raw, bool):
        value = raw
    elif isinstance(raw, str) and raw.strip().lower() in {"yes", "no", "true", "false"}:
        value = raw.strip().lower() in {"yes", "true"}
    else:
        raise AnswerValidationError(question.id, "Choose Yes or No.")
    return TypedValue(bool_value=value, display_value="Yes" if value else "No")


def _rating(question: Question, raw: Any) -> TypedValue:
    max_rating = int(_settings(question).get("max_rating", DEFAULT_MAX_RATING))
    if isinstance(raw, bool):
        raise AnswerValidationError(question.id, "Pick a rating.")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise AnswerValidationError(question.id, "Pick a rating.") from None
    if not 1 <= value <= max_rating:
        raise AnswerValidationError(
            question.id, f"Pick a rating between 1 and {max_rating}."
        )
    return TypedValue(
        number_value=float(value), display_value=f"{value}/{max_rating}"
    )


def _choice(question: Question, raw: Any) -> TypedValue:
    settings = _settings(question)
    multi = bool(settings.get("multi_select")) and question.type == QuestionType.MULTIPLE_CHOICE

    raw_ids = raw if isinstance(raw, list) else [raw]
    if not multi and len(raw_ids) > 1:
        raise AnswerValidationError(question.id, "Pick one option.")

    by_id = {opt.id: opt for opt in question.options}
    chosen: list[int] = []
    for item in raw_ids:
        try:
            option_id = int(item)
        except (TypeError, ValueError):
            raise AnswerValidationError(question.id, "Invalid option.") from None
        if option_id not in by_id:
            raise AnswerValidationError(
                question.id, "That option does not belong to this question."
            )
        if option_id not in chosen:
            chosen.append(option_id)

    if not chosen:
        raise AnswerValidationError(question.id, "Pick an option.")

    labels = [by_id[oid].label for oid in chosen]
    return TypedValue(option_ids=chosen, display_value=", ".join(labels))


_HANDLERS: dict[QuestionType, Any] = {
    QuestionType.SHORT_TEXT: _short_text,
    QuestionType.LONG_TEXT: _long_text,
    QuestionType.EMAIL: _email,
    QuestionType.NUMBER: _number,
    QuestionType.YES_NO: _yes_no,
    QuestionType.RATING: _rating,
    QuestionType.MULTIPLE_CHOICE: _choice,
    QuestionType.DROPDOWN: _choice,
}
