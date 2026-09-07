"""Database engine, session factory and the FastAPI session dependency."""

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by every model."""


def _engine_kwargs(url: str) -> dict:
    # A local SQLite file is used from FastAPI's threadpool, so the default
    # same-thread check has to go. Hosted libSQL speaks HTTP and needs neither.
    if url.startswith("sqlite:///"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


engine: Engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    **_engine_kwargs(settings.database_url),
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:
    """SQLite ignores ``ON DELETE CASCADE`` unless foreign keys are switched on.

    The pragma is per-connection, so it has to be reapplied on every checkout.
    Anything that is not local SQLite (libSQL over HTTP) is left alone.
    """
    if not settings.database_url.startswith("sqlite:///"):
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db() -> Iterator[Session]:
    """Yield a request-scoped session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
