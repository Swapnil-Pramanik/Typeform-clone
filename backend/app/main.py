"""FastAPI application entrypoint.

Vercel's Python runtime looks for a module-level ``FastAPI`` instance named
``app``; ``pyproject.toml`` points its entrypoint here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
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


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
