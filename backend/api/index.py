"""Serverless entrypoint.

Vercel loads this file directly rather than importing it as part of a package,
so the directory it sits in — not the project root — is what lands on
``sys.path``. That makes ``import app.main`` fail with ``No module named 'app'``,
which surfaces as ``FUNCTION_INVOCATION_FAILED`` with no useful message.

Putting the backend root on the path first is the whole job. Everything else
lives in ``app/``; this file deliberately contains no application logic.
"""

import os
import sys

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app  # noqa: E402  — must follow the sys.path fix above

__all__ = ["app"]
