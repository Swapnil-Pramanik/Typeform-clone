"""Database engine, session factory and the FastAPI session dependency."""

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by every model."""


def _engine_options(url: str) -> tuple[str, dict]:
    """Return the URL and keyword arguments to build the engine with.

    Two environment-specific quirks are handled here so that nothing else in the
    app has to know which database it is talking to:

    * **Local SQLite** is used from FastAPI's threadpool, so the driver's
      same-thread check has to be switched off.
    * **Hosted libSQL** carries its credential as an ``authToken`` query
      parameter, but ``sqlalchemy-libsql`` folds the query string into the URI it
      hands the driver, and the driver only reads the token from an ``auth_token``
      keyword argument — so the connection is rejected as an "empty JWT token".
      Lifting the token out of the URL and passing it explicitly is the fix.
    """
    if url.startswith("sqlite:///"):
        return url, {"connect_args": {"check_same_thread": False}}

    if "+libsql" in url:
        parsed = make_url(url)
        token = dict(parsed.query).get("authToken")
        if token:
            return str(parsed.difference_update_query(["authToken"])), {
                "connect_args": {"auth_token": token}
            }

    return url, {}


_url, _options = _engine_options(settings.database_url)

engine: Engine = create_engine(_url, pool_pre_ping=True, **_options)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _record) -> None:
    """Switch foreign keys on for every connection, local or hosted.

    SQLite ignores ``ON DELETE CASCADE`` unless foreign keys are enabled, and the
    pragma is per-connection rather than per-database. Without it, deleting a
    form would silently orphan its answers instead of cascading — so this has to
    apply to hosted libSQL too, not just the local file.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def get_db() -> Iterator[Session]:
    """Yield a request-scoped session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
