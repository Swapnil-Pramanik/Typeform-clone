"""Column types and the question-type vocabulary shared by models and schemas."""

import json
from enum import StrEnum
from typing import Any

from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


class JSONText(TypeDecorator):
    """A JSON value stored in a plain ``TEXT`` column.

    SQLAlchemy's built-in ``JSON`` type declares a ``JSON`` column, which SQLite
    gives no type affinity. Declaring ``TEXT`` and serialising here keeps the
    physical schema identical to the DDL documented in the README, and behaves
    the same against local SQLite and hosted libSQL.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect) -> str | None:
        # Compact separators keep list membership greppable: ``[3,5]`` not
        # ``[3, 5]``, which is what the choice-count query in
        # ``services.responses`` matches against.
        return None if value is None else json.dumps(value, separators=(",", ":"))

    def process_result_value(self, value: Any, dialect) -> Any:
        if value is None or value == "":
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None


class QuestionType(StrEnum):
    """Every block a form can contain.

    ``ending`` is deliberately one of these: the thank-you screen is a row in
    ``questions``, not a hardcoded page, so a form can own several endings.
    """

    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    EMAIL = "email"
    NUMBER = "number"
    YES_NO = "yes_no"
    RATING = "rating"
    ENDING = "ending"


#: Blocks that collect an answer. Everything else is a screen.
ANSWERABLE_TYPES: frozenset[QuestionType] = frozenset(
    t for t in QuestionType if t is not QuestionType.ENDING
)

#: Blocks whose answers are chosen from ``question_options``.
CHOICE_TYPES: frozenset[QuestionType] = frozenset(
    {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}
)


class RuleOperator(StrEnum):
    """How a logic rule compares an answer.

    Deliberately small: these cover every question type this app has.
    ``IS``/``IS_NOT`` compare an option ID, a boolean or a string depending on
    the question; ``GREATER_THAN``/``LESS_THAN`` apply to numbers and ratings;
    the ``ANSWERED`` pair ignore the value entirely.

    ``ALWAYS`` fires whatever the answer. It is how the builder's "Always go to"
    is stored: a catch-all kept last in ``position`` order, so the conditional
    rules above it still get their turn and it replaces the fall-through to the
    next question rather than competing with it.
    """

    IS = "is"
    IS_NOT = "is_not"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    ANSWERED = "answered"
    NOT_ANSWERED = "not_answered"
    ALWAYS = "always"


#: Operators that ignore ``value`` altogether.
VALUELESS_OPERATORS: frozenset[RuleOperator] = frozenset(
    {RuleOperator.ANSWERED, RuleOperator.NOT_ANSWERED, RuleOperator.ALWAYS}
)


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
