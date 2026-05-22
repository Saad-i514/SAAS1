"""
In-process TTL cache — zero cost, zero external dependency.

Serverless-safe: no threading.Lock (Vercel runs single-threaded per request).
Each warm instance gets its own cache; cold starts start fresh.

Strategy:
- Dashboard summary:  60s TTL
- Dashboard charts:   300s TTL
- Products list:      120s TTL
- Suppliers list:     300s TTL
"""

import time
from typing import Any, Optional
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

# Cache store: key -> (value, expires_at)
_store: dict = {}

# Tag store: company_id -> set of keys
_tags: dict = {}

# Stats
_stats = {"hits": 0, "misses": 0, "invalidations": 0}


def _make_key(*parts) -> str:
    """Create a stable cache key from arbitrary parts."""
    try:
        raw = json.dumps(parts, sort_keys=True, default=str)
        return hashlib.md5(raw.encode()).hexdigest()
    except Exception:
        return str(parts)


def get(key: str) -> Optional[Any]:
    """Return cached value or None if missing/expired."""
    try:
        entry = _store.get(key)
        if entry is None:
            _stats["misses"] += 1
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            _store.pop(key, None)
            _stats["misses"] += 1
            return None
        _stats["hits"] += 1
        return value
    except Exception:
        return None


def set(key: str, value: Any, ttl: int) -> None:
    """Store value with TTL in seconds."""
    try:
        _store[key] = (value, time.monotonic() + ttl)
    except Exception:
        pass


def set_tagged(company_id: int, key: str, value: Any, ttl: int) -> None:
    """Store value and register the key under the company's tag for bulk invalidation."""
    try:
        _store[key] = (value, time.monotonic() + ttl)
        if company_id not in _tags:
            _tags[company_id] = set()
        _tags[company_id].add(key)
    except Exception:
        pass


def invalidate_company(company_id: int) -> int:
    """Remove all cache entries for a company."""
    try:
        keys = _tags.pop(company_id, set())
        count = 0
        for k in keys:
            if _store.pop(k, None) is not None:
                count += 1
        _stats["invalidations"] += count
        return count
    except Exception:
        return 0


def cached(company_id: int, ttl: int, *key_parts) -> tuple:
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
    try:
        key = _make_key(company_id, *key_parts)
        return key, get(key)
    except Exception:
        return "", None


def stats() -> dict:
    """Return cache hit/miss stats."""
    try:
        total = _stats["hits"] + _stats["misses"]
        hit_rate = round(_stats["hits"] / total * 100, 1) if total > 0 else 0
        return {
            **_stats,
            "total_requests": total,
            "hit_rate_pct": hit_rate,
            "keys_in_store": len(_store),
        }
    except Exception:
        return _stats


def clear_expired() -> int:
    """Evict all expired entries."""
    try:
        now = time.monotonic()
        expired = [k for k, (_, exp) in list(_store.items()) if now > exp]
        for k in expired:
            _store.pop(k, None)
        return len(expired)
    except Exception:
        return 0
