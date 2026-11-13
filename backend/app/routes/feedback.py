"""Messages sent from the site's Feedback panel: kept in PostgreSQL and mailed
to the site's mailbox."""
import asyncio
import logging
import re

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from app import mail
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


def _send_mail(body: Feedback) -> None:
    try:
        mail.send(mail.feedback_mail(body.message, body.email, body.page))
    except Exception as e:
        logger.error(f"Feedback mail failed (the message is kept in the database): {e}")


@router.post("/feedback", status_code=204)
@limiter.limit("5/hour")
async def send_feedback(request: Request, body: Feedback, background: BackgroundTasks):
    if body.website:
        return Response(status_code=204)
    saved = False
    if db.available:
        try:
            await asyncio.to_thread(db.save_feedback, body.message, body.email, body.page)
            saved = True
        except Exception as e:
            logger.error(f"Feedback not saved: {e}")
    if not saved and not mail.configured():
        raise HTTPException(status_code=503, detail="Feedback can't be taken right now")
    if mail.configured():
        background.add_task(_send_mail, body)
    return Response(status_code=204)
