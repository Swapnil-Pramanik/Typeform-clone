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


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
