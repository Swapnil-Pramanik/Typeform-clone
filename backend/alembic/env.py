"""Alembic environment. The URL always comes from the app settings."""

from logging.config import fileConfig

from alembic import context

from app.config import settings
from app.db import Base, engine
from app.models.types import JSONText
import app.models  # noqa: F401  — registers every table on Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata


def render_item(type_, obj, autogen_context) -> str | bool:
    """Render ``JSONText`` columns as plain ``sa.Text()`` in generated migrations.

    The custom type only adds JSON (de)serialisation in Python; the physical
    column really is TEXT, so migrations stay self-contained and readable.
    """
    if type_ == "type" and isinstance(obj, JSONText):
        return "sa.Text()"
    return False


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,
        render_item=render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        # SQLite cannot ALTER columns in place; batch mode rewrites the table.
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            render_item=render_item,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
