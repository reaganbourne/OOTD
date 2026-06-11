"""Tests for public identity masking — raw emails must never surface as a
public display name in search / suggested / profile responses."""

from app.utils.identity import looks_like_email, public_display_name


class TestLooksLikeEmail:
    def test_detects_emails(self):
        assert looks_like_email("chase.primashailey@gmail.com")
        assert looks_like_email("a@b.co")

    def test_rejects_non_emails(self):
        assert not looks_like_email("chase")
        assert not looks_like_email("Cool Stylist")
        assert not looks_like_email(None)
        assert not looks_like_email("")
        assert not looks_like_email("no-at-symbol.com")


class TestPublicDisplayName:
    def test_prefers_clean_display_name(self):
        assert public_display_name("Cool Stylist", "coolstylist") == "Cool Stylist"

    def test_falls_back_to_username_when_display_is_email(self):
        assert public_display_name("chase@gmail.com", "chase") == "chase"

    def test_masks_email_when_both_are_emails(self):
        # The exact case QA hit: display name and username both the raw email.
        assert public_display_name("chase.primashailey@gmail.com", "chase.primashailey@gmail.com") == "chase.primashailey"

    def test_uses_username_when_display_missing(self):
        assert public_display_name(None, "realuser") == "realuser"

    def test_generic_fallback_when_nothing_usable(self):
        assert public_display_name(None, None) == "checkd member"

    def test_never_returns_raw_email(self):
        for dn, un in [
            ("a@b.com", "a@b.com"),
            ("a@b.com", None),
            (None, "a@b.com"),
        ]:
            result = public_display_name(dn, un)
            assert "@" not in (result or ""), f"leaked email for {dn!r}/{un!r}: {result!r}"
