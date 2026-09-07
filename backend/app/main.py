"""FastAPI application entrypoint.

Vercel's Python runtime looks for a module-level ``FastAPI`` instance named
``app``; ``pyproject.toml`` points its entrypoint here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.engine.url import make_url

from app.config import settings
from app.db import engine
from app.routers import (
    forms_router,
    public_router,
    questions_router,
    responses_router,
)

app = FastAPI(
    title="Typeform Clone API",
    version="1.0.0",
    description=(
        "Two surfaces: /api/forms/* authors forms and reads their responses; "
        "/api/f/{slug} serves published forms to the public and collects "
        "submissions without authentication."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms_router)
app.include_router(questions_router)
app.include_router(responses_router)
app.include_router(public_router)


@app.get("/", tags=["meta"], include_in_schema=False)
def root() -> dict[str, str]:
    """Something friendlier than a bare 404 for anyone who opens the base URL.

    It also makes a routing misconfiguration obvious: if the deployment rewrites
    paths instead of passing them through, every request lands here rather than
    on the endpoint that was asked for.
    """
    return {
        "service": "Typeform Clone API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, object]:
    """Liveness plus a database probe.

    A deployed function can import cleanly and still be unable to reach its
    database — wrong environment variable name, missing credential, unreachable
    host. Reporting which dialect is configured, whether a token was supplied,
    and the class of any connection failure turns that from a bare 500 into
    something diagnosable without shipping a debug build.

    Deliberately coarse: it never returns the credential, the host, or the
    driver's error text.
    """
    url = make_url(settings.database_url)
    database: dict[str, object] = {
        "dialect": url.drivername,
        "auth_token_configured": bool(settings.database_auth_token),
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database["status"] = "ok"
    except Exception as error:  # noqa: BLE001 — the class is the whole signal
        database["status"] = "unreachable"
        database["error"] = type(error).__name__

    return {"status": "ok", "database": database}
