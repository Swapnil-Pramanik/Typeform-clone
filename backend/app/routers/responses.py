"""Authoring surface — single-response reads at ``/api/responses/*``."""

from fastapi import APIRouter

from app.routers.deps import DbSession, FormError, not_found
from app.schemas import ResponseOut
from app.services import responses as response_service

router = APIRouter(prefix="/api/responses", tags=["responses"])


@router.get("/{response_id}", response_model=ResponseOut)
def get_response(response_id: int, db: DbSession):
    try:
        return response_service.get_response(db, response_id)
    except FormError as error:
        raise not_found(error) from error
