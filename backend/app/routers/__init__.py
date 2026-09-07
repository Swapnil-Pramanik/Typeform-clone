"""HTTP routers. Each one parses, calls a service, and returns — nothing more."""

from app.routers.forms import router as forms_router
from app.routers.public import router as public_router
from app.routers.questions import router as questions_router
from app.routers.responses import router as responses_router

__all__ = ["forms_router", "public_router", "questions_router", "responses_router"]
