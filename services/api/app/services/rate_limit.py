from __future__ import annotations

import threading
import time
from dataclasses import dataclass


@dataclass
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class FixedWindowRateLimiter:
    """Small in-process limiter for auth endpoints.

    This is intentionally dependency-free. In production, keep this as a local
    safety net and add a shared edge/Redis limiter so limits hold across
    multiple API instances.
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


login_rate_limiter = FixedWindowRateLimiter(max_attempts=10, window_seconds=60)
register_rate_limiter = FixedWindowRateLimiter(max_attempts=5, window_seconds=60)


def reset_auth_rate_limiters() -> None:
    login_rate_limiter.reset()
    register_rate_limiter.reset()
