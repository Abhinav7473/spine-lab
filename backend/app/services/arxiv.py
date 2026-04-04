import asyncio
import logging
import random
import re
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

NS = {
    "atom":  "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

MAX_RESULTS_PER_FETCH = 25

# Exponential backoff config
_BACKOFF_BASE = 20     # seconds
_BACKOFF_CAP  = 120    # seconds
_MAX_ATTEMPTS = 4
_JITTER_RATIO = 0.25   # ±25% of the computed wait

# Global semaphore — prevents concurrent ArXiv calls regardless of which
# endpoint triggered the fetch. One outbound request at a time.
_arxiv_sem = asyncio.Semaphore(1)

# Per-topic cooldown — maps normalized topic → monotonic timestamp of last fetch.
# Prevents re-fetching the same topic within ARXIV_COOLDOWN_MINS minutes.
_topic_last_fetched: dict[str, float] = {}

# Inter-request floor — ArXiv asks for ≥3s between consecutive calls.
# Enforced inside _fetch_with_retry (which runs under the semaphore, so
# _last_request_time needs no additional lock).
_MIN_REQUEST_INTERVAL = 3.0   # seconds
_last_request_time: float     = 0.0


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_papers(topic: str, max_results: int = MAX_RESULTS_PER_FETCH) -> list[dict]:
    """
    Query ArXiv for CS.AI papers matching a topic.
    Returns a list of dicts ready for bulk_upsert_papers().

    Guarantees:
    - At most one concurrent outbound ArXiv request (semaphore).
    - Cooldown: returns [] immediately if the same topic was fetched
      within ARXIV_COOLDOWN_MINS (configured in settings).
    - Exponential backoff with jitter on 429 / 5xx / network errors.
    - Retry-After header respected as either delta-seconds or HTTP-date.
    """
    key = _normalize_topic(topic)

    cooldown_secs = settings.arxiv_cooldown_mins * 60
    if _is_on_cooldown(key, cooldown_secs):
        elapsed = int(time.monotonic() - _topic_last_fetched[key])
        remaining = cooldown_secs - elapsed
        logger.info(
            "ArXiv fetch skipped — topic=%r on cooldown (%ds remaining)", topic, remaining
        )
        return []

    topic_query = topic.strip().replace(" ", "+")
    url = (
        f"{settings.arxiv_base_url}"
        f"?search_query=all:{topic_query}+AND+cat:cs.AI"
        f"&start=0&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )
    headers = {"User-Agent": "Spine/0.1 (research feed; contact via github)"}

    logger.info("ArXiv fetch: topic=%r max=%d", topic, max_results)

    async with _arxiv_sem:
        result = await _fetch_with_retry(url, headers, topic)

    _mark_fetched(key)
    return result


async def bulk_upsert_papers(db: AsyncSession, papers: list[dict]) -> int:
    """
    Insert papers in a single round-trip using PostgreSQL ON CONFLICT DO NOTHING.
    Returns the count of rows actually inserted (duplicates are silently skipped).
    """
    if not papers:
        return 0

    from app.models import Paper  # local import avoids circular at module level

    stmt = (
        pg_insert(Paper)
        .values(papers)
        .on_conflict_do_nothing(index_elements=["arxiv_id"])
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount


# ── Internal ──────────────────────────────────────────────────────────────────

async def _fetch_with_retry(url: str, headers: dict, topic: str) -> list[dict]:
    global _last_request_time

    # Enforce ArXiv's courtesy 3s minimum between consecutive requests.
    # The semaphore guarantees we're the only caller here, so no lock needed.
    gap = time.monotonic() - _last_request_time
    if gap < _MIN_REQUEST_INTERVAL:
        await asyncio.sleep(_MIN_REQUEST_INTERVAL - gap)

    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(_MAX_ATTEMPTS):
            _last_request_time = time.monotonic()
            try:
                response = await client.get(url, headers=headers)
            except httpx.RequestError as exc:
                wait = _jittered_wait(attempt)
                logger.warning(
                    "ArXiv network error (attempt %d/%d): %s — retrying in %.0fs",
                    attempt + 1, _MAX_ATTEMPTS, exc, wait,
                )
                if attempt == _MAX_ATTEMPTS - 1:
                    raise
                await asyncio.sleep(wait)
                continue

            if response.status_code == 429:
                wait = _parse_retry_after(response.headers.get("Retry-After")) \
                       or _jittered_wait(attempt)
                logger.warning(
                    "ArXiv 429 rate-limited (attempt %d/%d) — waiting %.0fs",
                    attempt + 1, _MAX_ATTEMPTS, wait,
                )
                if attempt == _MAX_ATTEMPTS - 1:
                    response.raise_for_status()
                await asyncio.sleep(wait)
                continue

            if response.status_code >= 500:
                wait = _jittered_wait(attempt)
                logger.warning(
                    "ArXiv %d server error (attempt %d/%d) — retrying in %.0fs",
                    response.status_code, attempt + 1, _MAX_ATTEMPTS, wait,
                )
                if attempt == _MAX_ATTEMPTS - 1:
                    response.raise_for_status()
                await asyncio.sleep(wait)
                continue

            response.raise_for_status()
            papers = _parse(response.text)
            logger.info(
                "ArXiv fetch OK: %d papers for topic=%r (attempt %d)",
                len(papers), topic, attempt + 1,
            )
            return papers

    return []  # unreachable; satisfies type checker


def _jittered_wait(attempt: int) -> float:
    """Exponential backoff with ±JITTER_RATIO random spread."""
    base = min(_BACKOFF_BASE * (2 ** attempt), _BACKOFF_CAP)
    jitter = random.uniform(-base * _JITTER_RATIO, base * _JITTER_RATIO)
    return max(1.0, base + jitter)


def _parse_retry_after(value: str | None) -> float | None:
    """
    Parse Retry-After — RFC 7231 allows either delta-seconds or HTTP-date.
    Returns seconds to wait, or None if unparseable.
    """
    if not value:
        return None
    # Try delta-seconds first (most common)
    try:
        secs = int(value)
        return min(float(secs), _BACKOFF_CAP)
    except ValueError:
        pass
    # Try HTTP-date ("Wed, 21 Oct 2025 07:28:00 GMT")
    try:
        from email.utils import parsedate_to_datetime
        dt  = parsedate_to_datetime(value)
        lag = (dt - datetime.now(timezone.utc)).total_seconds()
        return min(max(0.0, lag), _BACKOFF_CAP)
    except Exception:
        return None


def _normalize_topic(topic: str) -> str:
    return " ".join(topic.strip().lower().split())


def _is_on_cooldown(key: str, cooldown_secs: int) -> bool:
    last = _topic_last_fetched.get(key)
    return last is not None and (time.monotonic() - last) < cooldown_secs


def _mark_fetched(key: str) -> None:
    _topic_last_fetched[key] = time.monotonic()


# ── Parsing ───────────────────────────────────────────────────────────────────

def _parse(xml_text: str) -> list[dict]:
    root   = ET.fromstring(xml_text)
    papers = []

    for entry in root.findall("atom:entry", NS):
        arxiv_id = _text(entry, "atom:id", NS)
        if arxiv_id:
            arxiv_id = arxiv_id.split("/abs/")[-1].split("v")[0]

        published_raw = _text(entry, "atom:published", NS)
        published_at  = None
        if published_raw:
            try:
                published_at = date.fromisoformat(published_raw[:10])
            except ValueError:
                pass

        authors    = [a.findtext("atom:name", namespaces=NS) for a in entry.findall("atom:author", NS)]
        categories = [t.get("term") for t in entry.findall("atom:category", NS) if t.get("term")]
        comment    = _text(entry, "arxiv:comment", NS, clean=True)

        papers.append({
            "arxiv_id":     arxiv_id,
            "title":        _text(entry, "atom:title",   NS, clean=True),
            "abstract":     _text(entry, "atom:summary", NS, clean=True),
            "authors":      [a for a in authors if a],
            "categories":   categories,
            "published_at": published_at,
            "page_count":   _parse_page_count(comment),
        })

    return papers


def _parse_page_count(comment: str | None) -> int | None:
    if not comment:
        return None
    match = re.search(r"(\d+)\s+pages?", comment, re.IGNORECASE)
    return int(match.group(1)) if match else None


def _text(element, path: str, ns: dict, clean: bool = False) -> str | None:
    node = element.find(path, ns)
    if node is None or node.text is None:
        return None
    text = node.text.strip()
    if clean:
        text = " ".join(text.split())
    return text
