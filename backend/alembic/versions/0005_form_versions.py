"""Form version history.

Revision ID: 0005_form_versions
Revises: 0004_form_settings
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_form_versions"
down_revision = "0004_form_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "form_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "form_id",
            sa.Integer(),
            sa.ForeignKey("forms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="edit"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("snapshot", sa.Text(), nullable=False),
    )
    op.create_index("ix_form_versions_form", "form_versions", ["form_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_form_versions_form", table_name="form_versions")
    op.drop_table("form_versions")
