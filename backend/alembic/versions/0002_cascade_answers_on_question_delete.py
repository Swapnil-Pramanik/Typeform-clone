"""Cascade answers when their question row is deleted

Deleting a form cascades to its questions, but ``answers.question_id`` carried a
plain foreign key, so deleting a form that had collected responses failed with
``FOREIGN KEY constraint failed``.

This does not weaken the "answers outlive their questions" guarantee. Questions
are *soft*-deleted in normal use (``deleted_at``), and their rows survive; the
only time a question row is really removed is when the whole form is deleted, at
which point its answers should go too.

SQLite cannot alter a constraint in place, so the table is rebuilt.

Revision ID: 0002_cascade_answers
Revises: 0001_initial
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_cascade_answers"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLUMNS = (
    "id, response_id, question_id, question_title, question_type, "
    "text_value, number_value, bool_value, option_ids, display_value"
)


def _rebuild(question_fk_ondelete: str | None) -> None:
    op.rename_table("answers", "answers_old")
    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("response_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("question_title", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=32), nullable=False),
        sa.Column("text_value", sa.Text(), nullable=True),
        sa.Column("number_value", sa.Float(), nullable=True),
        sa.Column("bool_value", sa.Boolean(), nullable=True),
        sa.Column("option_ids", sa.Text(), nullable=True),
        sa.Column("display_value", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["response_id"], ["responses.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete=question_fk_ondelete
        ),
        sa.UniqueConstraint(
            "response_id", "question_id", name="uq_answer_response_question"
        ),
    )
    op.execute(f"INSERT INTO answers ({COLUMNS}) SELECT {COLUMNS} FROM answers_old")
    op.drop_table("answers_old")
    op.create_index("ix_answers_question", "answers", ["question_id"])


def upgrade() -> None:
    op.drop_index("ix_answers_question", table_name="answers")
    _rebuild("CASCADE")


def downgrade() -> None:
    op.drop_index("ix_answers_question", table_name="answers")
    _rebuild(None)
