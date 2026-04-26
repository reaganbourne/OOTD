"""
Caption suggestion service — calls Claude to generate 3 caption ideas for an outfit photo.

Best-effort: returns an empty list if the API key is missing or the call fails.
The rest of the app never imports anthropic directly.

Usage:
    from app.services.caption import suggest_captions

    suggestions = suggest_captions(file_bytes=image_bytes, content_type="image/jpeg")
    # ["Sunday brunch fit", "Laid back and cozy", "Coffee run ready"]
"""

import base64
import json
import logging

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

_PROMPT = """\
You are a creative fashion copywriter helping someone write a fun, relatable caption for their outfit photo.

Generate exactly 3 short caption suggestions for this outfit. Each should feel natural for social media —
punchy, specific to what you see, and slightly different in tone (e.g. one playful, one aesthetic, one straightforward).

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{"suggestions": ["caption one", "caption two", "caption three"]}

Rules:
- Each caption: 3–12 words, no hashtags, no emojis
- Be specific to the outfit — mention colors, vibes, or occasion if clear
- Keep it casual and genuine
"""


def suggest_captions(
    file_bytes: bytes,
    content_type: str,
) -> list[str]:
    """
    Generate 3 caption suggestions for an outfit image.

    Returns a list of suggestion strings (possibly empty on failure).
    Never raises — callers get an empty list if anything goes wrong.
    """
    if not settings.anthropic_api_key:
        return []

    image_data = base64.standard_b64encode(file_bytes).decode("utf-8")

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=256,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": content_type,
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": _PROMPT},
                    ],
                }
            ],
        )

        result = json.loads(message.content[0].text)
        suggestions = result.get("suggestions", [])

        if not isinstance(suggestions, list):
            logger.warning("Caption suggestion returned unexpected shape: %s", result)
            return []

        return [str(s).strip() for s in suggestions if s][:3]

    except Exception:
        logger.exception("Caption suggestion failed")
        return []
