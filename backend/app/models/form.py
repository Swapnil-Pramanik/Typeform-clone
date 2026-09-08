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
    #: Display switches — what the respondent flow shows. Presentation only, so
    #: it lives in JSON alongside the theme rather than earning columns.
    settings: Mapped[dict | None] = mapped_column(JSONText)
    #: Whether the form still takes submissions. A first-class column rather
    #: than a key in `settings`, because the server enforces it on every submit:
    #: this is access control, not presentation.
    accepting_responses: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
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
    #: Branching rules owned by this question, in evaluation order.
    rules: Mapped[list["QuestionRule"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionRule.position",
        foreign_keys="QuestionRule.question_id",
    )
    #: Declared so the unit of work knows answers depend on questions and emits
    #: their DELETE first. ``passive_deletes`` then hands the actual removal to
    #: the ``ON DELETE CASCADE`` on ``answers.question_id``, which is the real
    #: guarantee — it also covers bulk deletes that never load an ORM object.
    answers: Mapped[list["Answer"]] = relationship(  # noqa: F821
        back_populates="question", passive_deletes=True
    )
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.position",
    )

    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    @property
    def is_ending(self) -> bool:
        return self.type == QuestionType.ENDING


class QuestionRule(Base):
    """One branching rule: *if this answer matches, go there instead of onward.*

    Rules belong to the question being answered and are evaluated in ``position``
    order, first match winning — the same "first rule that fires" model the real
    product uses, which keeps authoring predictable without needing precedence
    syntax.
    """

    __tablename__ = "question_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    operator: Mapped[str] = mapped_column(String(16), nullable=False)
    #: JSON, so one column can hold an option ID, a boolean, a number or a
    #: string — whichever the question being compared produces.
    value: Mapped[object | None] = mapped_column(JSONText)
    target_question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    question: Mapped[Question] = relationship(
        back_populates="rules", foreign_keys=[question_id]
    )
    target: Mapped[Question] = relationship(foreign_keys=[target_question_id])

    __table_args__ = (Index("ix_question_rules_question", "question_id", "position"),)


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped[Question] = relationship(back_populates="options")

    #: Every form load fetches options by question; without this SQLite scans
    #: the whole table on the one request every respondent makes.
    __table_args__ = (
        Index("ix_question_options_question", "question_id", "position"),
    )


class FormVersion(Base):
    """A snapshot of a form as it stood at one moment, plus what changed.

    Kept as a whole-form JSON blob rather than a change log. A log of edits is
    smaller but only usable by replaying it, and replaying is exactly what goes
    wrong when a block was deleted halfway along. A snapshot restores by being
    applied, which is the operation the feature actually needs.

    ``summary`` is computed once, when the row is written, by diffing against
    the previous snapshot. Doing it here rather than at read time means the
    history reads the same in a year, when the diffing code has moved on.
    """

    __tablename__ = "form_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )
    #: ``edit`` | ``publish`` | ``unpublish`` | ``restore`` — what put this
    #: version here. Only ``edit`` rows coalesce; the rest are landmarks.
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="edit")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    snapshot: Mapped[dict] = mapped_column(JSONText, nullable=False)

    __table_args__ = (Index("ix_form_versions_form", "form_id", "created_at"),)


class FormSlugAlias(Base):
    """A public link a form used to answer on.

    Renaming a form re-mints its slug so the link reads like its current name.
    Without this table the previous link would simply 404, taking every message,
    email and QR code already sent with it — so the old slug is retired here
    instead of discarded, and the public route still resolves it.

    A retired slug is never reused for a different form: `_unique_slug` checks
    this table too, so a link can only ever point at the form it was minted for.
    """

    __tablename__ = "form_slug_aliases"

    slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    retired_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )
