"""Forms and their blocks: ``forms``, ``questions``, ``question_options``."""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.types import FormStatus, JSONText, QuestionType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    #: Null until the first publish. Retained on unpublish so a shared link
    #: keeps working once the form is published again.
    slug: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=FormStatus.DRAFT, server_default="draft"
    )
    welcome_screen: Mapped[dict | None] = mapped_column(JSONText)
    theme: Mapped[dict | None] = mapped_column(JSONText)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow, server_default=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime)

    questions: Mapped[list["Question"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )
    responses: Mapped[list["Response"]] = relationship(  # noqa: F821
        back_populates="form", cascade="all, delete-orphan"
    )

    @property
    def live_questions(self) -> list["Question"]:
        """Blocks the builder and the respondent flow should see.

        Soft-deleted questions stay in the table so historical answers keep a
        real foreign key, but they are invisible everywhere except the results
        view, which reads the per-answer snapshots instead.
        """
        return [q for q in self.questions if q.deleted_at is None]


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    #: Per-type knobs: ``max_rating``, ``multi_select``, ``min``, ``max``,
    #: ``placeholder``, ``button_text``, ``randomize``…
    settings: Mapped[dict | None] = mapped_column(JSONText)
    #: Soft delete. See the "answers must survive their questions" decision.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    form: Mapped[Form] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.position",
    )

    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    @property
    def is_ending(self) -> bool:
        return self.type == QuestionType.ENDING


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped[Question] = relationship(back_populates="options")
