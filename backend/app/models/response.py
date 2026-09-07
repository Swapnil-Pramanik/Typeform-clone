"""Collected submissions: ``responses`` and ``answers``."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.form import Form, utcnow
from app.models.types import JSONText


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )
    #: Null means the respondent dropped out. Completion rate is derived from
    #: this column, not stored.
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_complete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    meta: Mapped[dict | None] = mapped_column(JSONText)

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_responses_form", "form_id", "submitted_at"),)


class Answer(Base):
    """One respondent's answer to one question.

    Values live in typed columns rather than a JSON blob so that summary
    statistics ("count per choice", "average rating") are a ``GROUP BY`` the
    database performs, not a Python loop over deserialised rows.
    """

    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id"), nullable=False
    )
    #: Snapshots taken at submit time. If the creator later edits or deletes the
    #: question, this row still reports what was actually asked.
    question_title: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)

    text_value: Mapped[str | None] = mapped_column(Text)
    number_value: Mapped[float | None] = mapped_column(Float)
    bool_value: Mapped[bool | None] = mapped_column(Boolean)
    option_ids: Mapped[list[int] | None] = mapped_column(JSONText)
    #: Denormalised rendered string, so the results table is one query with no
    #: per-cell type switch on the client.
    display_value: Mapped[str] = mapped_column(Text, nullable=False, default="")

    response: Mapped[Response] = relationship(back_populates="answers")

    __table_args__ = (
        UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),
        Index("ix_answers_question", "question_id"),
    )
