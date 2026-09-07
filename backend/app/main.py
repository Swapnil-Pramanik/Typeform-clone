"""FastAPI application entrypoint.

Vercel loads ``api/index.py``, which re-exports the ``app`` built here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, settings
from app.routers import (
    forms_router,
    meta_router,
    public_router,
    questions_router,
    responses_router,
)


def build_app(config: Settings | None = None) -> FastAPI:
    """Assemble the application.

    Settings are an argument rather than a global read so that the CORS rules —
    which are invisible until a browser exercises them — can be tested directly.
    """
    config = config or settings

    instance = FastAPI(
        title="Typeform Clone API",
        version="1.0.0",
        description=(
            "Two surfaces: /api/forms/* authors forms and reads their responses; "
            "/api/f/{slug} serves published forms to the public and collects "
            "submissions without authentication."
        ),
    )

    instance.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        # CORS_ORIGIN_REGEX admits hostnames that change per deployment. Anchor it
        # on the account-scoped suffix: *.vercel.app names are global, so matching
        # the project name alone also matches someone else's deployment.
        allow_origin_regex=config.cors_origin_regex or None,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in (
        meta_router,
        forms_router,
        questions_router,
        responses_router,
        public_router,
    ):
        instance.include_router(router)

    return instance


app = build_app()
