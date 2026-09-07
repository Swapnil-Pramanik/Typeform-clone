"""Form settings and the open/closed switch

Two additions, deliberately of different kinds.

``settings`` is JSON: the display switches (branding, navigation arrows,
progress bar, question number, required asterisks, answer letters) only affect
how the respondent flow draws itself, so they sit alongside ``theme`` rather
than earning six columns.

``accepting_responses`` is a real column. The server checks it on every
submission, which makes it access control rather than presentation — and access
control should be queryable, indexable and impossible to lose in a JSON blob.

Revision ID: 0004_form_settings
Revises: 0003_question_rules
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_form_settings"
down_revision: str | None = "0003_question_rules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("forms", sa.Column("settings", sa.Text(), nullable=True))
    op.add_column(
        "forms",
        sa.Column(
            "accepting_responses",
            sa.Boolean(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("forms", "accepting_responses")
    op.drop_column("forms", "settings")
