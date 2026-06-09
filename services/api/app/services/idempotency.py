"""
In-process idempotency store for outfit creation.

Tracks recently used Idempotency-Key values per user so that a rapid
double-submit (double-tap, network retry, etc.) returns the first response
instead of creating a duplicate outfit.

Design notes:
- TTL of 5 minutes covers mobile network retry windows.
- Keyed by (user_id, idempotency_key) so keys are scoped to the submitting user.
- In-memory only — restarts clear the store, but that's acceptable: the main
  risk is rapid retries within a single session, not cross-restart duplicates.
- For multi-instance deploys, pair with a short-lived Redis key at the edge.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class _Entry:
    value: Any
    expires_at: float


class IdempotencyStore:
    TTL = 300  # 5 minutes

    def __init__(self) -> None:
        self._store: dict[tuple[str, str], _Entry] = {}
        self._lock = threading.Lock()

    def get(self, user_id: str, key: str) -> Any | None:
        """Return a previously stored value for (user_id, key), or None."""
        composite = (user_id, key)
        with self._lock:
            entry = self._store.get(composite)
            if entry is None:
                return None
            if time.monotonic() > entry.expires_at:
                del self._store[composite]
                return None
            return entry.value

    def set(self, user_id: str, key: str, value: Any) -> None:
        """Store value under (user_id, key) for TTL seconds."""
        composite = (user_id, key)
        expires_at = time.monotonic() + self.TTL
        with self._lock:
            self._store[composite] = _Entry(value=value, expires_at=expires_at)
            self._evict_expired()

    def _evict_expired(self) -> None:
        """Remove stale entries (called under lock)."""
        now = time.monotonic()
        stale = [k for k, v in self._store.items() if v.expires_at < now]
        for k in stale:
            del self._store[k]

    def clear(self) -> None:
        """Clear all entries (used in tests)."""
        with self._lock:
            self._store.clear()


# Singleton used by routers
outfit_idempotency_store = IdempotencyStore()
