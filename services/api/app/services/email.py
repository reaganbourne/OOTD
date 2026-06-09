"""
Email service backed by Resend.

Set RESEND_API_KEY and FROM_EMAIL in environment variables.
If RESEND_API_KEY is not set, emails are logged to stdout (useful in development).
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password reset link to the given address."""
    if not settings.resend_api_key:
        logger.warning(
            "[email] RESEND_API_KEY not set — would have sent password reset to %s: %s",
            to_email,
            reset_url,
        )
        return

    import resend  # type: ignore[import]

    resend.api_key = settings.resend_api_key

    resend.Emails.send({
        "from": settings.from_email,
        "to": [to_email],
        "subject": "Reset your checkd password",
        "html": _reset_email_html(reset_url),
        "text": _reset_email_text(reset_url),
    })


def _reset_email_html(reset_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; color: #111; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
    <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">Reset your password</p>
    <p style="color: #555; margin-bottom: 24px;">
      We received a request to reset your checkd password. Click the button below to choose a new one.
      This link expires in 1 hour.
    </p>
    <a href="{reset_url}"
       style="display:inline-block; background:#e879a0; color:#fff; text-decoration:none;
              padding:12px 24px; border-radius:8px; font-weight:600;">
      Reset password
    </a>
    <p style="color:#999; font-size:0.85rem; margin-top:32px;">
      If you didn't request this, you can safely ignore this email.
      Your password won't change until you click the link above.
    </p>
  </body>
</html>
""".strip()


def _reset_email_text(reset_url: str) -> str:
    return (
        "Reset your checkd password\n\n"
        "We received a request to reset your password. "
        "Click the link below to choose a new one (expires in 1 hour):\n\n"
        f"{reset_url}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
