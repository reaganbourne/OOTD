"""
Story card generator — produces a 1080×1920 PNG shareable card for an outfit.

Single responsibility: take outfit data + raw image bytes, return PNG bytes.
Everything Pillow-specific is contained here.

Layout (Instagram story format, 1080×1920):
  ┌──────────────────────────────────┐
  │                                  │
  │         OUTFIT IMAGE             │  top 65%
  │          (cover fit)             │
  │                                  │
  │        ↓ gradient fade           │
  ├──────────────────────────────────┤
  │  [tone badge]                    │
  │                                  │
  │  vibe check text                 │  bottom 35%
  │                                  │
  │  @username                       │
  │  "caption"                       │
  │  April 17, 2026                  │
  │                          OOTD ✦  │
  └──────────────────────────────────┘

Usage:
    from app.services.story_card import generate_story_card

    png_bytes = generate_story_card(
        image_bytes=...,
        username="usera",
        caption="Sunday brunch fit",
        vibe_check_text="Effortlessly cool.",
        vibe_check_tone="streetwear",
        worn_on=date(2026, 4, 17),
    )
"""

import io
import textwrap
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ── Card dimensions (Instagram story) ────────────────────────────────────────
CARD_W = 1080
CARD_H = 1920
IMAGE_H = int(CARD_H * 0.65)       # 1248px — outfit photo area
BOTTOM_Y = IMAGE_H                  # where the dark panel starts
GRADIENT_H = 220                    # fade zone between photo and panel

# ── Colours ───────────────────────────────────────────────────────────────────
BG_DARK = (13, 15, 20)             # near-black background
TEXT_PRIMARY = (242, 242, 242)
TEXT_SECONDARY = (148, 163, 184)   # slate-400
BRAND_COLOUR = (129, 140, 248)     # indigo-400

TONE_COLOURS: dict[str, tuple[int, int, int]] = {
    "casual":      (96, 165, 250),   # blue
    "formal":      (251, 191, 36),   # amber
    "streetwear":  (251, 113, 133),  # rose
    "preppy":      (74, 222, 128),   # green
    "boho":        (196, 132, 252),  # violet
    "athletic":    (34, 211, 238),   # cyan
    "vintage":     (251, 146, 60),   # orange
    "minimalist":  (203, 213, 225),  # slate-300
    "maximalist":  (244, 114, 182),  # pink
    "business":    (147, 197, 253),  # blue-300
}

# ── Font paths (DejaVu ships with fonts-dejavu-core on Debian/Ubuntu) ─────────
_FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
_FONT_REGULAR = _FONT_DIR / "DejaVuSans.ttf"
_FONT_BOLD = _FONT_DIR / "DejaVuSans-Bold.ttf"


def _font(path: Path, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a TrueType font, falling back to PIL's default if unavailable."""
    try:
        return ImageFont.truetype(str(path), size)
    except (OSError, IOError):
        return ImageFont.load_default()


def fetch_image(url: str) -> bytes:
    """Download image bytes from a URL. Isolated for easy monkeypatching in tests."""
    with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310
        return resp.read()


def generate_story_card(
    image_bytes: bytes,
    username: str,
    caption: str | None = None,
    vibe_check_text: str | None = None,
    vibe_check_tone: str | None = None,
    worn_on: date | None = None,
) -> bytes:
    """
    Render a 1080×1920 story card PNG and return raw bytes.

    Args:
        image_bytes:     Raw bytes of the outfit photo.
        username:        The outfit owner's username (displayed as @username).
        caption:         Optional outfit caption.
        vibe_check_text: Optional AI-generated vibe sentence.
        vibe_check_tone: Optional tone label (e.g. "streetwear").
        worn_on:         Optional date the outfit was worn.

    Returns:
        PNG bytes ready to stream as image/png.
    """
    card = Image.new("RGB", (CARD_W, CARD_H), BG_DARK)

    # ── 1. Outfit photo (cover-fit into the top 65%) ──────────────────────────
    try:
        outfit_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        outfit_img = _cover_fit(outfit_img, CARD_W, IMAGE_H)
        card.paste(outfit_img, (0, 0))
    except Exception:
        pass  # leave dark bg if image is broken

    # ── 2. Gradient overlay (photo → dark panel) ──────────────────────────────
    _apply_gradient(card, BOTTOM_Y - GRADIENT_H, GRADIENT_H)

    # ── 3. Bottom panel text ──────────────────────────────────────────────────
    draw = ImageDraw.Draw(card)
    y = BOTTOM_Y + 48

    # Tone badge
    if vibe_check_tone:
        badge_colour = TONE_COLOURS.get(vibe_check_tone.lower(), TEXT_SECONDARY)
        badge_font = _font(_FONT_BOLD, 32)
        badge_text = f"  {vibe_check_tone.upper()}  "
        bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 12
        rx0, ry0 = 64, y
        rx1, ry1 = rx0 + bw + pad * 2, y + bh + pad * 2
        draw.rounded_rectangle([rx0, ry0, rx1, ry1], radius=8, fill=(*badge_colour, 40))
        draw.rounded_rectangle([rx0, ry0, rx1, ry1], radius=8, outline=badge_colour, width=2)
        draw.text((rx0 + pad, ry0 + pad), badge_text.strip(), font=badge_font, fill=badge_colour)
        y = ry1 + 36

    # Vibe check text
    if vibe_check_text:
        vibe_font = _font(_FONT_REGULAR, 42)
        wrapped = textwrap.fill(vibe_check_text, width=32)
        draw.text((64, y), wrapped, font=vibe_font, fill=TEXT_PRIMARY)
        line_count = wrapped.count("\n") + 1
        y += line_count * 52 + 40

    # Divider line
    draw.line([(64, y), (CARD_W - 64, y)], fill=(255, 255, 255, 25), width=1)
    y += 36

    # @username
    user_font = _font(_FONT_BOLD, 44)
    draw.text((64, y), f"@{username}", font=user_font, fill=TEXT_PRIMARY)
    y += 62

    # Caption
    if caption:
        cap_font = _font(_FONT_REGULAR, 38)
        wrapped_cap = textwrap.fill(caption, width=36)
        draw.text((64, y), wrapped_cap, font=cap_font, fill=TEXT_SECONDARY)
        y += (wrapped_cap.count("\n") + 1) * 48 + 12

    # Date worn
    if worn_on:
        date_font = _font(_FONT_REGULAR, 34)
        date_str = worn_on.strftime("%B %-d, %Y")
        draw.text((64, y), date_str, font=date_font, fill=TEXT_SECONDARY)

    # ── 4. OOTD branding (bottom-right) ───────────────────────────────────────
    brand_font = _font(_FONT_BOLD, 38)
    brand_text = "OOTD ✦"
    bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    bw = bbox[2] - bbox[0]
    draw.text((CARD_W - 64 - bw, CARD_H - 72), brand_text, font=brand_font, fill=BRAND_COLOUR)

    # ── 5. Encode to PNG bytes ────────────────────────────────────────────────
    buf = io.BytesIO()
    card.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cover_fit(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Scale and centre-crop the image to fill target_w × target_h (cover fit)."""
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def _apply_gradient(card: Image.Image, start_y: int, height: int) -> None:
    """Paint a vertical gradient from transparent to BG_DARK over the card."""
    draw = ImageDraw.Draw(card)
    for i in range(height):
        alpha = int(255 * (i / height) ** 1.5)   # accelerating fade
        r, g, b = BG_DARK
        draw.line([(0, start_y + i), (CARD_W, start_y + i)], fill=(r, g, b, alpha))
