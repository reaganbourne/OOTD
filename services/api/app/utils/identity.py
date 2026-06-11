"""Helpers for safely presenting user identity on public surfaces.

Some legacy/seed accounts have an email address stored as their display name
or username. We must never surface a raw email as someone's public identity
(search, explore, suggestions, profiles). These helpers defensively mask it.
"""

import re

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def looks_like_email(value: str | None) -> bool:
    """True when value is a bare email address."""
    return bool(value and _EMAIL_RE.match(value.strip()))


def public_display_name(display_name: str | None, username: str | None) -> str | None:
    """
    Return a safe public display name, never a raw email address.

    Preference order:
      1. display_name, if set and not email-like
      2. username, if set and not email-like
      3. the local part of whichever email-like value we have (before '@')
      4. a generic fallback
    """
    if display_name and not looks_like_email(display_name):
        return display_name
    if username and not looks_like_email(username):
        return username
    candidate = (display_name or username or "").strip()
    if "@" in candidate:
        local = candidate.split("@", 1)[0].strip()
        return local or "checkd member"
    return candidate or "checkd member"
