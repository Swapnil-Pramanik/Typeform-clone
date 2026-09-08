"""Retired slugs, so an old link keeps working.

Revision ID: 0007_slug_aliases
Revises: 0006_option_index
"""

import sqlalchemy as sa
from alembic import op

revision = "0007_slug_aliases"
down_revision = "0006_option_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "form_slug_aliases",
        sa.Column("slug", sa.String(length=64), primary_key=True),
        sa.Column(
            "form_id",
            sa.Integer(),
            sa.ForeignKey("forms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "retired_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_form_slug_aliases_form", "form_slug_aliases", ["form_id"])


def downgrade() -> None:
    op.drop_index("ix_form_slug_aliases_form", table_name="form_slug_aliases")
    op.drop_table("form_slug_aliases")
