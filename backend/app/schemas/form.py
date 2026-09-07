"""Request and response bodies for the authoring surface."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.types import FormStatus, QuestionType


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- options -----------------------------------------------------------------


class OptionIn(BaseModel):
    label: str = Field(min_length=1, max_length=500)


class OptionOut(ORMModel):
    id: int
    label: str
    position: int


# --- questions ---------------------------------------------------------------


class QuestionCreate(BaseModel):
    type: QuestionType
    title: str = Field(default="", max_length=1000)
    description: str | None = Field(default=None, max_length=2000)
    required: bool = False
    settings: dict[str, Any] | None = None
    options: list[OptionIn] | None = None


class QuestionUpdate(BaseModel):
    """Every field optional — this endpoint is the target of the builder autosave."""

    type: QuestionType | None = None
    title: str | None = Field(default=None, max_length=1000)
    description: str | None = Field(default=None, max_length=2000)
    required: bool | None = None
    settings: dict[str, Any] | None = None
    #: When present, replaces the option list wholesale.
    options: list[OptionIn] | None = None


class QuestionOut(ORMModel):
    id: int
    type: QuestionType
    title: str
    description: str | None
    required: bool
    position: int
    settings: dict[str, Any] | None
    options: list[OptionOut] = []


class QuestionOrderIn(BaseModel):
    """The complete ordered array of question IDs — see the positions decision."""

    question_ids: list[int] = Field(min_length=1)


# --- forms -------------------------------------------------------------------


class FormCreate(BaseModel):
    title: str = Field(default="Untitled form", min_length=1, max_length=500)


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    welcome_screen: dict[str, Any] | None = None
    theme: dict[str, Any] | None = None


class FormSummaryOut(ORMModel):
    """A dashboard row."""

    id: int
    title: str
    slug: str | None
    status: FormStatus
    #: Carried so the dashboard's row thumbnail can preview the form's colour.
    theme: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    question_count: int = 0
    response_count: int = 0
    completed_count: int = 0


class FormOut(ORMModel):
    """The full form the builder loads."""

    id: int
    title: str
    slug: str | None
    status: FormStatus
    welcome_screen: dict[str, Any] | None
    theme: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    questions: list[QuestionOut] = []


class PublicFormOut(BaseModel):
    """What a respondent is allowed to see. No numeric form ID, ever."""

    slug: str
    title: str
    welcome_screen: dict[str, Any] | None
    theme: dict[str, Any] | None
    questions: list[QuestionOut]
