"""Tiny JSON-over-HTTP helper with an in-process TTL cache (no new dependencies)."""
import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

_cache: Dict[str, Tuple[float, Any]] = {}
_lock = threading.Lock()

USER_AGENT = "TravelGuardian/1.0 (travel-safety digital twin)"


class FetchError(Exception):
    """Raised when a provider can't be reached or returns an error."""


def fetch_json(base_url: str, params: Dict[str, Any], ttl_seconds: int, timeout: int = 10) -> Tuple[Any, float, bool]:
    """
    Returns (data, fetched_at_epoch, from_cache). from_cache=True means the
    value came from this process's cache (the UI labels it CACHED rather
    than LIVE). Raises FetchError on network/HTTP/parse failure.
    """
    url = f"{base_url}?{urllib.parse.urlencode(params, safe=',;:')}"
    now = time.time()
    with _lock:
        hit = _cache.get(url)
        if hit and now - hit[0] < ttl_seconds:
            return hit[1], hit[0], True

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as he:
        raise FetchError(f"HTTP {he.code} from {urllib.parse.urlparse(base_url).netloc}") from he
    except (urllib.error.URLError, TimeoutError, OSError) as ne:
        raise FetchError(f"Could not reach {urllib.parse.urlparse(base_url).netloc}: {getattr(ne, 'reason', ne)}") from ne
    except ValueError as pe:
        raise FetchError(f"Invalid JSON from {urllib.parse.urlparse(base_url).netloc}") from pe

    with _lock:
        _cache[url] = (now, data)
        if len(_cache) > 500:
            for k in [k for k, (t, _) in _cache.items() if now - t > 3600]:
                _cache.pop(k, None)
    return data, now, False


def clear_cache() -> None:
    with _lock:
        _cache.clear()


def iso(epoch: Optional[float]) -> Optional[str]:
    if epoch is None:
        return None
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(epoch))
