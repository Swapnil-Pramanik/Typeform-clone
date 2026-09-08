"""Request and response bodies for submissions and analytics."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.types import QuestionType


class AnswerIn(BaseModel):
    """One raw answer as the respondent flow sends it.

    ``value`` is intentionally untyped here: ``services.validation`` is the one
    place that knows what each question type accepts.
    """

    question_id: int
    value: Any = None


class SubmissionIn(BaseModel):
    answers: list[AnswerIn] = Field(default_factory=list)
    #: False for a drop-out beacon, which records a partial response.
    is_complete: bool = True
    meta: dict[str, Any] | None = None


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    question_title: str
    question_type: QuestionType
    display_value: str
    text_value: str | None = None
    number_value: float | None = None
    bool_value: bool | None = None
    option_ids: list[int] | None = None


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int
    started_at: datetime
    submitted_at: datetime | None
    is_complete: bool
    meta: dict[str, Any] | None = None
    answers: list[AnswerOut] = []
    #: The ending this submission reached, resolved from the form's current
    #: rules rather than stored — see `_to_out` in `services/responses.py`.
    ending_title: str | None = None


class ResponseDeleteIn(BaseModel):
    """The rows a checkbox column has selected."""

    response_ids: list[int] = Field(min_length=1, max_length=200)


class ResponsePage(BaseModel):
    items: list[ResponseOut]
    total: int
    page: int
    page_size: int


class SubmissionOut(BaseModel):
    """Returned to the respondent: the ending block to render, as data."""

    response_id: int
    ending: dict[str, Any] | None = None


class ChoiceCount(BaseModel):
    label: str
    count: int


class QuestionStats(BaseModel):
    question_id: int
    title: str
    type: QuestionType
    answered: int
    #: multiple_choice / dropdown / yes_no
    choices: list[ChoiceCount] | None = None
    #: rating / number
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    #: short_text / long_text / email — a few recent verbatims
    samples: list[str] | None = None


class FormSummaryStats(BaseModel):
    form_id: int
    total_responses: int
    completed_responses: int
    completion_rate: float
    questions: list[QuestionStats]
