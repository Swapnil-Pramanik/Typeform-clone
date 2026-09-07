"""CORS is invisible until a browser hits it, so pin the behaviour down here.

A regex that is too narrow silently blocks the app's own frontend; one that is
too broad admits an unrelated deployment. Both have happened on this project:
``*.vercel.app`` hostnames are global, and an identically-named project owned by
someone else answers on the unscoped name.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import build_app

SCOPE = "pramanikswapnil9-1372s-projects"
REGEX = rf"https://typeform-clone-frontend.*-{SCOPE}\.vercel\.app"

#: Vercel gives a project three kinds of hostname: a short random-word alias, an
#: account-scoped alias, and a per-deployment URL. The short alias carries no
#: account suffix, so a regex anchored on the scope misses it — it has to be
#: listed explicitly, and forgetting it blocks the app that people actually use.
SHORT_ALIAS = "https://typeform-clone-frontend-drab.vercel.app"

ALLOWED = [
    SHORT_ALIAS,                                                      # what we hand out
    f"https://typeform-clone-frontend-{SCOPE}.vercel.app",            # account-scoped
    f"https://typeform-clone-frontend-nxzusc65d-{SCOPE}.vercel.app",  # a preview
    "http://localhost:3000",                                          # local dev
]
BLOCKED = [
    "https://typeform-clone-frontend.vercel.app",   # same name, different owner
    "https://typeform-clone-frontend-evil.vercel.app",
    "https://evil.example.com",
]


@pytest.fixture
def client() -> TestClient:
    settings = Settings(
        cors_origins=f"{SHORT_ALIAS},http://localhost:3000",
        cors_origin_regex=REGEX,
    )
    return TestClient(build_app(settings))


def _allowed_origin(client: TestClient, origin: str) -> str | None:
    response = client.options(
        "/api/forms",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    return response.headers.get("access-control-allow-origin")


@pytest.mark.parametrize("origin", ALLOWED)
def test_our_own_origins_are_allowed(client, origin):
    assert _allowed_origin(client, origin) == origin


@pytest.mark.parametrize("origin", BLOCKED)
def test_unrelated_origins_are_blocked(client, origin):
    assert _allowed_origin(client, origin) is None
