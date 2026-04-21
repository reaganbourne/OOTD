"""
Vibe check service — calls Claude to generate a short fashion vibe for an outfit.

Single responsibility: take image bytes + optional caption, return a
(vibe_check_text, vibe_check_tone) tuple. Everything Anthropic-specific
is contained here so the rest of the app never imports anthropic directly.

Usage:
    from app.services.vibe_check import run_vibe_check

    text, tone = run_vibe_check(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        caption="Sunday brunch fit",
    )
"""

import base64
import json
import logging

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

# Predefined tones Tomi can map to UI themes / colors on the frontend.
VALID_TONES = {
    "casual",
    "formal",
    "streetwear",
    "preppy",
    "boho",
    "athletic",
    "vintage",
    "minimalist",
    "maximalist",
    "business",
}

_PROMPT = """\
You are a fashion-savvy friend giving a vibe check on someone's outfit photo.{caption_line}

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{{"vibe_check_text": "...", "vibe_check_tone": "..."}}

Rules:
- vibe_check_text: 1-2 punchy, encouraging sentences about the overall vibe. Be specific and fun.
- vibe_check_tone: pick EXACTLY ONE word from this list: {tones}
"""


def run_vibe_check(
    file_bytes: bytes,
    content_type: str,
    caption: str | None = None,
) -> tuple[str, str] | tuple[None, None]:
    """
    Generate a vibe check for an outfit image using Claude.

    Args:
        file_bytes:   Raw image bytes (same bytes uploaded to S3).
        content_type: MIME type, e.g. "image/jpeg".
        caption:      Optional caption the user wrote for the outfit.

    Returns:
        (vibe_check_text, vibe_check_tone) on success.
        (None, None) if the API key is missing or the call fails — outfit
        creation continues normally; vibe check is best-effort.
    """
    if not settings.anthropic_api_key:
        return None, None

    # Claude vision accepts base64-encoded image data directly.
    image_data = base64.standard_b64encode(file_bytes).decode("utf-8")
    caption_line = f'\nCaption: "{caption}"' if caption else ""
    prompt = _PROMPT.format(
        caption_line=caption_line,
        tones=", ".join(sorted(VALID_TONES)),
    )

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
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        result = json.loads(message.content[0].text)
        text = str(result.get("vibe_check_text", "")).strip()
        tone = str(result.get("vibe_check_tone", "")).strip().lower()

        if not text or tone not in VALID_TONES:
            logger.warning("Vibe check returned unexpected shape: %s", result)
            return None, None

        return text, tone

    except Exception:
        logger.exception("Vibe check failed — outfit will be saved without it")
        return None, None
