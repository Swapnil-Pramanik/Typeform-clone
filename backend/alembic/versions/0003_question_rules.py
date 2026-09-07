"""Branching rules

Adds ``question_rules``: *if this answer matches, go there instead of onward.*
Rules belong to the question being answered, are evaluated in ``position`` order
with the first match winning, and point at another question in the same form —
which may be an ending, since endings are question rows too.

Both foreign keys cascade. A rule has no meaning once either end of it is gone.

Revision ID: 0003_question_rules
Revises: 0002_cascade_answers
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_question_rules"
down_revision: str | None = "0002_cascade_answers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "question_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("operator", sa.String(length=16), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("target_question_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["target_question_id"], ["questions.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_question_rules_question", "question_rules", ["question_id", "position"]
    )


def downgrade() -> None:
    op.drop_index("ix_question_rules_question", table_name="question_rules")
    op.drop_table("question_rules")
