"""
In-process TTL cache — zero cost, zero external dependency.

Strategy (cost-effective & fast):
- Dashboard summary:  60s TTL  (refreshes every minute, feels live)
- Dashboard charts:   300s TTL (5 min — chart data changes slowly)
- Products list:      120s TTL (2 min — inventory changes on transactions)
- Suppliers list:     300s TTL (5 min — rarely changes)
- Reports:            120s TTL (2 min)

Cache is keyed by (company_id, ...) so each tenant gets isolated cache entries.
Any write (transaction, product update, etc.) calls invalidate() for that company.

Why NOT Vercel KV here:
- This backend is Python on Vercel serverless — each invocation is a fresh process.
  In-process cache works perfectly because Vercel reuses warm instances.
- Vercel KV (Upstash Redis) costs $0.20/100K requests and adds ~20-50ms HTTP
  round-trip per cache hit. In-process is 0ms and free.
- For a multi-server setup, switch to Redis. For Vercel serverless, this is optimal.
"""

import time
import threading
from typing import Any, Optional, Callable
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

_lock = threading.Lock()

# Cache store: key -> (value, expires_at)
_store: dict[str, tuple[Any, float]] = {}

# Stats for monitoring
_stats = {"hits": 0, "misses": 0, "invalidations": 0}


def _make_key(*parts) -> str:
    """Create a stable cache key from arbitrary parts."""
    raw = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def get(key: str) -> Optional[Any]:
    """Return cached value or None if missing/expired."""
    with _lock:
        entry = _store.get(key)
        if entry is None:
            _stats["misses"] += 1
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del _store[key]
            _stats["misses"] += 1
            return None
        _stats["hits"] += 1
        return value


def set(key: str, value: Any, ttl: int) -> None:
    """Store value with TTL in seconds."""
    with _lock:
        _store[key] = (value, time.monotonic() + ttl)


def invalidate_company(company_id: int) -> int:
    """
    Remove all cache entries for a company.
    Call this after any write (transaction, product update, etc.).
    Returns number of keys removed.
    """
    prefix = _make_key(company_id)[:8]  # first 8 chars of company hash
    with _lock:
        keys_to_delete = [k for k in _store if k.startswith(prefix)]
        # Also scan all keys that contain company_id in their source
        # (we embed company_id as first part of every key)
        company_keys = []
        for k, (v, _) in list(_store.items()):
            pass  # keys are hashed — use tag-based approach below

        # Tag-based: store a set of keys per company_id
        tag_key = f"__tag__{company_id}"
        tagged = _store.get(tag_key)
        if tagged:
            tagged_keys = tagged[0] if tagged else set()
            for k in list(tagged_keys):
                _store.pop(k, None)
            _store.pop(tag_key, None)
            _stats["invalidations"] += len(tagged_keys)
            return len(tagged_keys)
    return 0


def set_tagged(company_id: int, key: str, value: Any, ttl: int) -> None:
    """Store value and register the key under the company's tag for bulk invalidation."""
    with _lock:
        _store[key] = (value, time.monotonic() + ttl)
        tag_key = f"__tag__{company_id}"
        existing = _store.get(tag_key)
        tag_set = existing[0] if existing else set()
        tag_set.add(key)
        # Tags themselves don't expire — they're cleaned up on invalidation
        _store[tag_key] = (tag_set, time.monotonic() + 86400)


def cached(company_id: int, ttl: int, *key_parts) -> tuple[str, Optional[Any]]:
    """
    Helper: build a tagged key and return (key, cached_value_or_None).
    Usage:
        key, cached_val = cache.cached(company_id, 60, "dashboard", timeframe)
        if cached_val is not None:
            return cached_val
        result = expensive_query()
        cache.set_tagged(company_id, key, result, 60)
        return result
    """
    key = _make_key(company_id, *key_parts)
    return key, get(key)


def stats() -> dict:
    """Return cache hit/miss stats."""
    with _lock:
        total = _stats["hits"] + _stats["misses"]
        hit_rate = round(_stats["hits"] / total * 100, 1) if total > 0 else 0
        return {
            **_stats,
            "total_requests": total,
            "hit_rate_pct": hit_rate,
            "keys_in_store": len(_store),
        }


def clear_expired() -> int:
    """Evict all expired entries. Call periodically if needed."""
    now = time.monotonic()
    with _lock:
        expired = [k for k, (_, exp) in _store.items() if now > exp]
        for k in expired:
            del _store[k]
        return len(expired)
