"""Mail from the API to the site's own mailbox, sent through that mailbox's SMTP
server (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)."""
import os
import smtplib
from email.message import EmailMessage

# Where feedback goes, unless FEEDBACK_TO says otherwise
SITE_ADDRESS = "contact@metrikdelta.com"


def configured() -> bool:
    return all(os.getenv(name) for name in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def feedback_mail(message: str, email: str | None, page: str | None) -> EmailMessage:
    """A visitor's feedback as a mail to the site; replying answers the visitor when they left an address."""
    mail = EmailMessage()
    mail["From"] = os.getenv("SMTP_USER", SITE_ADDRESS)
    mail["To"] = os.getenv("FEEDBACK_TO", SITE_ADDRESS)
    mail["Subject"] = f"Feedback · {page or 'metrikdelta.com'}"
    if email:
        mail["Reply-To"] = email
    lines = [message, "", "—", f"Page: https://metrikdelta.com{page}" if page else "Page: unknown", f"Reply to: {email or 'no address left'}"]
    mail.set_content("\n".join(lines))
    return mail


def send(mail: EmailMessage) -> None:
    """Over SSL (port 465 unless SMTP_PORT says otherwise)."""
    with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "465")), timeout=20) as server:
        server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        server.send_message(mail)
