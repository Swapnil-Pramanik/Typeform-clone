"""Index question_options by question.

Revision ID: 0006_option_index
Revises: 0005_form_versions

Loading a form fetches its options with ``WHERE question_id IN (...)``, and
without this index SQLite answered that with a full scan of the table — on the
one request every respondent makes.
"""

from alembic import op

revision = "0006_option_index"
down_revision = "0005_form_versions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_question_options_question",
        "question_options",
        ["question_id", "position"],
    )


def downgrade() -> None:
    op.drop_index("ix_question_options_question", table_name="question_options")
