from __future__ import annotations

import threading
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request, status


@dataclass
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class FixedWindowRateLimiter:
    """In-process fixed-window rate limiter.

    Intentionally dependency-free. Works as a last line of defence on a single
    instance. For multi-instance deploys, pair with a shared Redis counter at
    the edge.
    """

    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> RateLimitDecision:
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            attempts = [ts for ts in self._attempts.get(key, []) if ts > cutoff]

            if len(attempts) >= self.max_attempts:
                retry_after = max(1, int(self.window_seconds - (now - attempts[0])))
                self._attempts[key] = attempts
                return RateLimitDecision(False, retry_after)

            attempts.append(now)
            self._attempts[key] = attempts
            return RateLimitDecision(True, 0)

    def reset(self) -> None:
        with self._lock:
            self._attempts.clear()


# ── Limiter instances ─────────────────────────────────────────────────────────

# Auth — keyed by IP
login_rate_limiter = FixedWindowRateLimiter(max_attempts=10, window_seconds=600)     # 10 / 10 min
register_rate_limiter = FixedWindowRateLimiter(max_attempts=5, window_seconds=3600)  # 5 / hour

# Authenticated actions — keyed by user ID
upload_rate_limiter = FixedWindowRateLimiter(max_attempts=30, window_seconds=86400)   # 30 / day
caption_rate_limiter = FixedWindowRateLimiter(max_attempts=20, window_seconds=86400)  # 20 / day
comment_rate_limiter = FixedWindowRateLimiter(max_attempts=60, window_seconds=3600)   # 60 / hour
like_rate_limiter = FixedWindowRateLimiter(max_attempts=200, window_seconds=3600)     # 200 / hour


def reset_all_rate_limiters() -> None:
    for limiter in (
        login_rate_limiter,
        register_rate_limiter,
        upload_rate_limiter,
        caption_rate_limiter,
        comment_rate_limiter,
        like_rate_limiter,
    ):
        limiter.reset()


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    """Best-effort client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def check_rate_limit(limiter: FixedWindowRateLimiter, key: str) -> None:
    """Raise HTTP 429 if the key has exceeded its limit."""
    decision = limiter.check(key)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )
