from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import cast, desc, func, select
from sqlalchemy.types import Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import Paper, PaperSignal, ReadingSession, User

router = APIRouter(prefix="/feed", tags=["feed"])


# ── Response models ───────────────────────────────────────────────────────────

class PaperOut(BaseModel):
    id:           UUID
    arxiv_id:     str
    title:        str
    abstract:     str | None
    authors:      list[str] | None
    published_at: date | None
    page_count:   int | None
    categories:   list[str] | None
    signal_score: float | None
    scroll_depth: float | None
    read_status:  str
    reason:       str | None

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    streak:         int
    papers_started: int
    papers_deep:    int
    papers_done:    int


class FeedResponse(BaseModel):
    cold_start:               bool
    sessions_until_reranking: int
    hero:   PaperOut | None
    queue:  list[PaperOut]
    missed: list[PaperOut]
    new:    list[PaperOut]
    stats:  StatsOut

# ── Read-status thresholds ────────────────────────────────────────────────────
# These classify each paper into a section of the feed.
_DEPTH_DONE     = 0.85   # ≥ this → paper is complete, move out of main feed
_DEPTH_READING  = 0.15   # ≥ this → read past abstract ("in progress")
_DWELL_SKIMMED  = 60     # seconds — below this + low scroll = user barely touched it


@router.get("/{user_id}", response_model=FeedResponse)
async def get_feed(
    user_id: UUID,
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a structured feed with four named sections:

      hero   — one paper: highest-signal in-progress, or newest unseen
      queue  — up to 3: in-progress papers the user has already engaged with
      missed — up to 2: papers the user opened briefly and never returned to
      new    — rest: unseen papers, newest first

    Also returns per-user stats (streak, read counts) for the sidebar.

    Cold start (< MIN_SESSIONS_FOR_RERANKING):
      Feed collapses to hero + new only. No behavioral ranking yet.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session_count = (await db.execute(
        select(func.count()).select_from(ReadingSession).where(ReadingSession.user_id == user_id)
    )).scalar()

    stats = await _compute_stats(db, user_id)
    in_cold_start = session_count < settings.min_sessions_reranking

    if in_cold_start:
        result = await db.execute(
            select(Paper).order_by(Paper.published_at.desc()).limit(limit)
        )
        all_papers = result.scalars().all()
        papers = [_fmt(p, None, reason="latest in your topics") for p in all_papers]
        return {
            "cold_start":               True,
            "sessions_until_reranking": settings.min_sessions_reranking - session_count,
            "hero":   papers[0] if papers else None,
            "queue":  [],
            "missed": [],
            "new":    papers[1:],
            "stats":  stats,
        }

    # ── Categorize papers the user has signals for ────────────────────────────
    rows = (await db.execute(
        select(Paper, PaperSignal)
        .join(PaperSignal, (PaperSignal.paper_id == Paper.id) & (PaperSignal.user_id == user_id))
    )).all()

    done, in_progress, skimmed = [], [], []

    for row in rows:
        p, sig = row.Paper, row.PaperSignal
        if sig.max_scroll_depth >= _DEPTH_DONE:
            reason = "completed"
        elif sig.max_scroll_depth >= _DEPTH_READING:
            reason = "you were reading this"
        else:
            reason = "matched your reading pattern"
        formatted = _fmt(p, sig.signal_score, sig.max_scroll_depth, sig.total_dwell_secs, reason=reason)
        if sig.max_scroll_depth >= _DEPTH_DONE:
            done.append(formatted)
        elif sig.max_scroll_depth >= _DEPTH_READING:
            in_progress.append(formatted)
        elif sig.total_dwell_secs < _DWELL_SKIMMED:
            skimmed.append(formatted)
        else:
            # Spent time but didn't scroll — audio mode or focused on top section
            in_progress.append(formatted)

    in_progress.sort(key=lambda p: p["signal_score"] or 0, reverse=True)
    skimmed.sort(    key=lambda p: p["signal_score"] or 0)

    # ── Unseen papers ─────────────────────────────────────────────────────────
    seen_ids = [row.Paper.id for row in rows]
    unseen_q = select(Paper).order_by(Paper.published_at.desc()).limit(limit)
    if seen_ids:
        unseen_q = unseen_q.where(Paper.id.not_in(seen_ids))
    unseen = [_fmt(p, None, reason="new in your topics") for p in (await db.execute(unseen_q)).scalars().all()]

    # ── Assemble sections ─────────────────────────────────────────────────────
    missed = skimmed[:2]

    if in_progress:
        hero  = in_progress[0]
        queue = in_progress[1:4]       # up to 3 more
    elif unseen:
        hero   = unseen[0]
        unseen = unseen[1:]
        queue  = []
    else:
        hero  = None
        queue = []

    used = 1 + len(queue) + len(missed)
    new  = unseen[: max(0, limit - used)]

    return {
        "cold_start":               False,
        "sessions_until_reranking": 0,
        "hero":   hero,
        "queue":  queue,
        "missed": missed,
        "new":    new,
        "stats":  stats,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _compute_stats(db: AsyncSession, user_id: UUID) -> dict:
    rows = (await db.execute(
        select(PaperSignal.max_scroll_depth, PaperSignal.total_dwell_secs)
        .where(PaperSignal.user_id == user_id)
    )).all()

    return {
        "streak":         await _compute_streak(db, user_id),
        "papers_started": len(rows),
        "papers_deep":    sum(1 for r in rows if r.max_scroll_depth >= _DEPTH_READING),
        "papers_done":    sum(1 for r in rows if r.max_scroll_depth >= _DEPTH_DONE),
    }


async def _compute_streak(db: AsyncSession, user_id: UUID) -> int:
    """Consecutive days with at least one reading session, counting backwards from today."""
    result = await db.execute(
        select(cast(ReadingSession.started_at, SADate).label("d"))
        .where(ReadingSession.user_id == user_id)
        .group_by(cast(ReadingSession.started_at, SADate))
        .order_by(desc(cast(ReadingSession.started_at, SADate)))
    )
    dates = [row.d for row in result.all()]
    if not dates:
        return 0

    today = date.today()
    # Streak breaks if most recent session was more than 1 day ago
    if (today - dates[0]).days > 1:
        return 0

    streak = 0
    anchor = dates[0]
    for i, d in enumerate(dates):
        if d == anchor - timedelta(days=i):
            streak += 1
        else:
            break
    return streak


def _fmt(paper: Paper, score, scroll_depth=None, dwell_secs=None, reason=None) -> dict:
    if scroll_depth is None:
        read_status = "new"
    elif scroll_depth >= _DEPTH_DONE:
        read_status = "done"
    elif scroll_depth >= _DEPTH_READING:
        read_status = "reading"
    else:
        read_status = "skimmed"

    return {
        "id":           paper.id,
        "arxiv_id":     paper.arxiv_id,
        "title":        paper.title,
        "abstract":     paper.abstract,
        "authors":      paper.authors,
        "published_at": paper.published_at,
        "page_count":   paper.page_count,
        "categories":   paper.categories,
        "signal_score": score,
        "scroll_depth": scroll_depth,
        "read_status":  read_status,
        "reason":       reason,
    }
