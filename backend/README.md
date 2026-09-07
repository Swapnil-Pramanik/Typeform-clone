# Backend

FastAPI + SQLAlchemy + SQLite/libSQL. See the [root README](../README.md) for the
architecture, schema decisions and API overview.

```bash
uv venv && uv pip install -e .      # or: python -m venv .venv && pip install -e .
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/python -m app.seed
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/python -m pytest tests    # 11 tests over the schema's invariants
```
