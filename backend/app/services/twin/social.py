"""
Real-world social signal integration (HackCelestial Midnight Task 1):
public Bluesky posts mentioning weather/travel conditions near the route.

API: Bluesky public AppView, keyless, no account required.
  GET https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=<term>&limit=<n>&sort=latest
Lexicon: app.bsky.feed.searchPosts / app.bsky.feed.defs#postView (atproto).

This is SUPPORTING / COMMUNITY evidence only. It is stored under its own
top-level `social` state key -- never merged into weather/flood/GDACS -- and
propagate() (route risk, flood exposure, travel delay, emergency readiness)
never reads it. A social post can never become a verified fact and can never
trigger emergency communication; nothing in this module touches
comms_service, Twilio, or the emergency API.

Never fabricated: on any failure (network, HTTP, malformed JSON) this returns
UNAVAILABLE with the real reason and an empty signal list -- the rest of the
Digital Twin keeps working exactly as if this module didn't exist.
"""
import re
from typing import Any, Dict, List, Tuple

from app.services.twin.http_cache import FetchError, fetch_json, iso

BLUESKY_URL = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts"
SOCIAL_TTL_SECONDS = 600
SOURCE = "Bluesky (public.api.bsky.app)"
MAX_QUERIES = 3
POSTS_PER_QUERY = 10
MAX_SIGNALS_RETURNED = 15

# Search terms derived from context, never a single hardcoded city.
TOPIC_TERMS = ["rain", "flooding", "waterlogging", "storm", "travel"]

# Deterministic relevance filter: a post must mention a weather/hazard term
# (not just the city name / "travel") to be shown as a weather-related signal.
# No LLM is used to judge relevance or factuality.
WEATHER_KEYWORDS = re.compile(
    r"\b(rain|raining|rainfall|flood|floods|flooding|waterlog|waterlogging|storm|"
    r"cyclone|downpour|monsoon|drizzle|thunderstorm|hail|heavy rain|landslide)\b",
    re.IGNORECASE,
)


def _build_queries(city_names: List[str]) -> List[Tuple[str, str]]:
    """Returns up to MAX_QUERIES (query_string, display_term) pairs derived
    from the journey's real city names -- never a fixed city."""
    cities = [c.strip() for c in city_names if c and c.strip()][:2] or ["your route"]
    queries: List[Tuple[str, str]] = []
    for city in cities:
        for term in TOPIC_TERMS:
            if len(queries) >= MAX_QUERIES:
                return queries
            queries.append((f"{city} {term}", f"{city} {term}"))
    return queries


def _search(query: str) -> Tuple[List[Dict[str, Any]], float, bool]:
    data, fetched_at, cached = fetch_json(
        BLUESKY_URL, {"q": query, "limit": POSTS_PER_QUERY, "sort": "latest"}, SOCIAL_TTL_SECONDS, timeout=10
    )
    return (data or {}).get("posts") or [], fetched_at, cached


def _post_url(uri: str, handle: str) -> str:
    # at://did:plc:xxx/app.bsky.feed.post/<rkey> -> public web URL
    rkey = uri.rsplit("/", 1)[-1] if uri else ""
    return f"https://bsky.app/profile/{handle}/post/{rkey}" if handle and rkey else ""


def fetch_route_social_signals(city_names: List[str]) -> Dict[str, Any]:
    queries = _build_queries(city_names)
    try:
        fetched_at = None
        cached_any = False
        raw_posts: List[Tuple[Dict[str, Any], str]] = []
        for query, display_term in queries:
            posts, ts, cached = _search(query)
            fetched_at = ts if fetched_at is None else fetched_at
            cached_any = cached_any or cached
            for p in posts:
                raw_posts.append((p, display_term))
    except FetchError as e:
        return {
            "status": "UNAVAILABLE", "source": SOURCE, "fetched_at": None,
            "reason": str(e), "queries": [q for q, _ in queries], "signals": [],
            "disclaimer": "Public community reports are not independently verified.",
        }

    seen = set()
    signals = []
    for post, display_term in raw_posts:
        record = post.get("record") or {}
        text = record.get("text") or ""
        if not WEATHER_KEYWORDS.search(text):
            continue  # relevance filter: must actually mention a weather/hazard term
        uri = post.get("uri") or ""
        if not uri or uri in seen:
            continue
        seen.add(uri)
        author = post.get("author") or {}
        handle = author.get("handle") or ""
        signals.append({
            "id": f"bsky-{post.get('cid') or uri}",
            "text": text[:280],
            "author_handle": handle,
            "uri": uri,
            "public_url": _post_url(uri, handle),
            "created_at": record.get("createdAt"),
            "indexed_at": post.get("indexedAt"),
            "query": display_term,
            "source": SOURCE,
        })

    signals.sort(key=lambda s: s.get("indexed_at") or "", reverse=True)
    signals = signals[:MAX_SIGNALS_RETURNED]

    return {
        "status": "CACHED" if cached_any else "LIVE",
        "source": SOURCE,
        "fetched_at": iso(fetched_at),
        "queries": [q for q, _ in queries],
        "signals": signals,
        "disclaimer": "Public community reports are not independently verified.",
    }
