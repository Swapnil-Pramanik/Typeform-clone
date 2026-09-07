"""Guard the two dependency lists against drifting apart.

The deployment resolves ``pyproject.toml``; ``requirements.txt`` exists because
Vercel's Python runtime also reads it. Keeping them in step by hand failed once
already — ``sqlalchemy-libsql`` sat in an optional extra, was skipped at deploy
time, and the app died at import with ``No module named 'sqlalchemy_libsql'``.
"""

import re
import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def _names(specs: list[str]) -> set[str]:
    """Reduce requirement specs to bare distribution names."""
    return {
        re.split(r"[><=!\[;]", spec, maxsplit=1)[0].strip().lower().replace("_", "-")
        for spec in specs
        if spec and not spec.startswith("#")
    }


def test_requirements_matches_pyproject_dependencies():
    pyproject = tomllib.loads((BACKEND / "pyproject.toml").read_text())
    declared = _names(pyproject["project"]["dependencies"])
    installed = _names((BACKEND / "requirements.txt").read_text().splitlines())

    assert declared == installed, (
        "pyproject.toml and requirements.txt disagree.\n"
        f"  only in pyproject.toml: {sorted(declared - installed)}\n"
        f"  only in requirements.txt: {sorted(installed - declared)}"
    )


def test_libsql_driver_is_a_hard_dependency():
    """Production runs on Turso, so the driver cannot be an optional extra."""
    pyproject = tomllib.loads((BACKEND / "pyproject.toml").read_text())
    assert "sqlalchemy-libsql" in _names(pyproject["project"]["dependencies"])


def test_settings_tolerate_pasted_whitespace_and_quotes():
    """Env vars pasted into a deployment UI arrive with stray characters."""
    from app.config import Settings

    dirty = Settings(
        database_url="  sqlite+libsql://host?secure=true\n",
        database_auth_token='"eyJhbGciOiJFZERTQSJ9.body.sig"\n',
        cors_origins=" http://localhost:3000 ",
    )
    assert dirty.database_url == "sqlite+libsql://host?secure=true"
    assert dirty.database_auth_token == "eyJhbGciOiJFZERTQSJ9.body.sig"
    assert dirty.cors_origins == "http://localhost:3000"
