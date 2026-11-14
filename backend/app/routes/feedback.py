"""Messages sent from the site's Feedback panel, kept in PostgreSQL and read
through GET /api/admin/feedback. They aren't mailed: Railway's plan blocks
outgoing SMTP."""
import asyncio
import logging
import re

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from app.limiter import limiter
from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Feedback(BaseModel):
    message: str = Field(max_length=2000)
    email: str | None = Field(default=None, max_length=254)
    page: str | None = Field(default=None, max_length=500)
    # Hidden from people: only a bot fills it in
    website: str = ""

    @field_validator("message")
    @classmethod
    def says_something(cls, message: str) -> str:
        message = message.strip()
        if len(message) < 3:
            raise ValueError("The message is empty")
        return message

    @field_validator("email")
    @classmethod
    def an_address_or_none(cls, email: str | None) -> str | None:
        email = (email or "").strip()
        if not email:
            return None
        if not EMAIL.match(email):
            raise ValueError("Not an email address")
        return email


@router.post("/feedback", status_code=204)
@limiter.limit("5/hour")
async def send_feedback(request: Request, body: Feedback):
    if body.website:
        return Response(status_code=204)
    try:
        if not db.available:
            raise RuntimeError("no database")
        await asyncio.to_thread(db.save_feedback, body.message, body.email, body.page)
    except Exception as e:
        logger.error(f"Feedback not saved: {e}")
        raise HTTPException(status_code=503, detail="Feedback can't be taken right now")
    return Response(status_code=204)
