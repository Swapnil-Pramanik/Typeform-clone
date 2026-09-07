"""FastAPI application entrypoint.

Vercel's Python runtime looks for a module-level ``FastAPI`` instance named
``app``; ``pyproject.toml`` points its entrypoint here.
"""

import hashlib
import logging

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

logger = logging.getLogger("typeform.health")

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
    # Set CORS_ORIGIN_REGEX to admit hostnames that change per deployment.
    allow_origin_regex=settings.cors_origin_regex or None,
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
    token = settings.database_auth_token or ""
    database: dict[str, object] = {
        "dialect": url.drivername,
        "auth_token_configured": bool(token),
        # Shape only, never content. A JWT is three dot-separated segments; a
        # value pasted with surrounding quotes or a trailing newline shows up
        # here as an unexpected length while still looking "configured".
        "auth_token_length": len(token),
        "auth_token_segments": len(token.split(".")) if token else 0,
        "auth_token_clean": token == token.strip().strip("\"'"),
        # A one-way fingerprint, so a deployed instance can be compared against a
        # known-good value without either side revealing the credential.
        "auth_token_fingerprint": (
            hashlib.sha256(token.encode()).hexdigest()[:8] if token else None
        ),
        # The Turso hostname is useless without a token, and a wrong host looks
        # identical to a wrong credential from the outside.
        "host": url.host,
    }

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database["status"] = "ok"
    except Exception as error:  # noqa: BLE001 — the class is the whole signal
        # The driver's message can name the host, so it goes to the logs rather
        # than to an unauthenticated caller.
        logger.exception("database probe failed")
        database["status"] = "unreachable"
        database["error"] = type(error).__name__

    return {"status": "ok", "database": database}
