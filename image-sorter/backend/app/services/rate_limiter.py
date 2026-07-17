"""Simple in-process rate limiting for sensitive API endpoints."""

from __future__ import annotations

from collections import defaultdict, deque
import threading
import time


class RateLimitExceeded(Exception):
    def __init__(self, retry_after_seconds: int):
        super().__init__("Rate limit exceeded.")
        self.retry_after_seconds = retry_after_seconds


_lock = threading.Lock()
_buckets: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    now = time.time()
    cutoff = now - window_seconds

    with _lock:
        bucket = _buckets[key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            raise RateLimitExceeded(retry_after)

        bucket.append(now)


def reset_rate_limiter() -> None:
    with _lock:
        _buckets.clear()
