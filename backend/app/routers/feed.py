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
    recommendations:          list[PaperOut]  # max 3: algo | affinity | explore
    unread:                   list[PaperOut]  # unseen papers, newest first
    stats:                    StatsOut


# ── Read-status thresholds ────────────────────────────────────────────────────
_DEPTH_READING  = 0.15   # ≥ this → read past abstract ("in progress")
_DWELL_SKIMMED  = 60     # seconds — below this + low scroll = barely touched


@router.get("/{user_id}", response_model=FeedResponse)
async def get_feed(
    user_id: UUID,
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns curated recommendations (max 3) and the full unread queue.

    Recommendations:
      1. Best match — highest-signal in-progress paper, or top unseen (algo)
      2. Affinity   — unseen paper sharing categories with user's most-read topic
      3. Explore    — unseen paper from a category outside the user's history

    Cold start (< MIN_SESSIONS_FOR_RERANKING):
      First 3 newest papers become recommendations; rest go to unread queue.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session_count = (await db.execute(
        select(func.count()).select_from(ReadingSession).where(ReadingSession.user_id == user_id)
    )).scalar()

    stats = await _compute_stats(db, user_id)
    in_cold_start = session_count < settings.min_sessions_reranking

    # ── Fetch papers the user has seen ───────────────────────────────────────
    seen_rows = (await db.execute(
        select(Paper, PaperSignal)
        .join(PaperSignal, (PaperSignal.paper_id == Paper.id) & (PaperSignal.user_id == user_id))
    )).all()

    seen_ids = [row.Paper.id for row in seen_rows]

    # ── Fetch unseen papers (newest first) ───────────────────────────────────
    unseen_q = select(Paper).order_by(Paper.published_at.desc()).limit(limit)
    if seen_ids:
        unseen_q = unseen_q.where(Paper.id.not_in(seen_ids))
    unseen_papers = (await db.execute(unseen_q)).scalars().all()

    if in_cold_start:
        unseen = [_fmt(p, None, reason="latest in your topics") for p in unseen_papers]
        return {
            "cold_start":               True,
            "sessions_until_reranking": settings.min_sessions_reranking - session_count,
            "recommendations":          unseen[:3],
            "unread":                   unseen[3:],
            "stats":                    stats,
        }

    # ── Categorize seen papers (exclude explicitly completed) ─────────────────
    in_progress = []
    for row in seen_rows:
        p, sig = row.Paper, row.PaperSignal
        if sig.completed:
            continue
        if sig.max_scroll_depth >= _DEPTH_READING or sig.total_dwell_secs >= _DWELL_SKIMMED:
            in_progress.append((p, sig))

    in_progress.sort(key=lambda x: x[1].signal_score or 0, reverse=True)

    # ── Build 3 recommendations ───────────────────────────────────────────────
    recommendations = []
    used_ids: set = set()

    # Rec 1 — Best match: highest-signal in-progress, or top unseen
    if in_progress:
        p, sig = in_progress[0]
        recommendations.append(_fmt(
            p, sig.signal_score, sig.max_scroll_depth, sig.total_dwell_secs,
            reason="pick up where you left off",
        ))
        used_ids.add(p.id)
    elif unseen_papers:
        p = unseen_papers[0]
        recommendations.append(_fmt(p, None, reason="top pick for you"))
        used_ids.add(p.id)

    # Rec 2 — Affinity: most common category in user's reading history
    user_cats: list[str] = []
    for row in seen_rows:
        p, sig = row.Paper, row.PaperSignal
        if p.categories and (sig.signal_score or 0) > 0:
            user_cats.extend(p.categories)

    if user_cats:
        cat_counts: dict[str, int] = {}
        for c in user_cats:
            cat_counts[c] = cat_counts.get(c, 0) + 1
        top_cat = max(cat_counts, key=lambda c: cat_counts[c])

        affinity_candidates = [
            p for p in unseen_papers
            if p.id not in used_ids and p.categories and top_cat in p.categories
        ]
        if affinity_candidates:
            p = affinity_candidates[0]
            recommendations.append(_fmt(p, None, reason=f"more like what you read — {top_cat}"))
            used_ids.add(p.id)

    # Rec 3 — Explore: paper from a category outside the user's history
    if user_cats:
        explored_cats = set(user_cats)
        explore_candidates = [
            p for p in unseen_papers
            if p.id not in used_ids
            and p.categories
            and not any(c in explored_cats for c in p.categories)
        ]
        if explore_candidates:
            p = explore_candidates[0]
            main_cat = p.categories[0]
            recommendations.append(_fmt(p, None, reason=f"explore — {main_cat}"))
            used_ids.add(p.id)

    # Fill remaining slots from unseen if needed
    if len(recommendations) < 3:
        for p in unseen_papers:
            if p.id not in used_ids:
                recommendations.append(_fmt(p, None, reason="new in your topics"))
                used_ids.add(p.id)
            if len(recommendations) == 3:
                break

    # ── Unread queue — everything not surfaced as a recommendation ────────────
    unread = [_fmt(p, None) for p in unseen_papers if p.id not in used_ids]

    return {
        "cold_start":               False,
        "sessions_until_reranking": 0,
        "recommendations":          recommendations,
        "unread":                   unread,
        "stats":                    stats,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _compute_stats(db: AsyncSession, user_id: UUID) -> dict:
    rows = (await db.execute(
        select(PaperSignal.max_scroll_depth, PaperSignal.total_dwell_secs, PaperSignal.completed)
        .where(PaperSignal.user_id == user_id)
    )).all()

    return {
        "streak":         await _compute_streak(db, user_id),
        "papers_started": len(rows),
        "papers_deep":    sum(1 for r in rows if r.max_scroll_depth >= _DEPTH_READING),
        "papers_done":    sum(1 for r in rows if r.completed),
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
