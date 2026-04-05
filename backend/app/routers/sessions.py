from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import ReadingEvent, ReadingSession, PaperSignal, Paper, SectionSignal

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionStart(BaseModel):
    user_id: UUID
    paper_id: UUID


class EventPayload(BaseModel):
    event_type: str          # scroll | section_enter | section_exit | external_open | blur | focus
    section: str | None = None
    payload: dict | None = None


class SessionClose(BaseModel):
    stayed_in_app: bool = True
    completed: bool = False           # True only when user explicitly clicks "done reading"
    reached_past_abstract: bool = False
    total_dwell_secs: int
    max_scroll_depth: float           # 0.0 – 1.0
    sections_visited: list[str] = []
    section_dwells: dict[str, int] = {}  # section → dwell_secs; written to section_signals


@router.post("/", status_code=201)
async def start_session(body: SessionStart, db: AsyncSession = Depends(get_db)):
    session = ReadingSession(user_id=body.user_id, paper_id=body.paper_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_id": session.id}


@router.post("/{session_id}/events", status_code=201)
async def log_event(session_id: UUID, body: EventPayload, db: AsyncSession = Depends(get_db)):
    event = ReadingEvent(
        session_id=session_id,
        event_type=body.event_type,
        section=body.section,
        payload=body.payload,
    )
    db.add(event)
    await db.commit()
    return {"ok": True}


@router.post("/{session_id}/close")
async def close_session(session_id: UUID, body: SessionClose, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ReadingSession).where(ReadingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Close the session
    session.ended_at = datetime.now(timezone.utc)
    session.stayed_in_app = body.stayed_in_app
    session.reached_past_abstract = body.reached_past_abstract

    # Compute signal score
    # Normalize dwell by page_count to avoid raw-time bias (see Open Problems in README)
    paper_result = await db.execute(select(Paper).where(Paper.id == session.paper_id))
    paper = paper_result.scalar_one()
    page_count = paper.page_count or 10  # fallback if unknown

    in_app_multiplier = 1.0 if body.stayed_in_app else 0.4

    # Upsert paper_signals
    existing = await db.execute(
        select(PaperSignal).where(
            PaperSignal.user_id == session.user_id,
            PaperSignal.paper_id == session.paper_id,
        )
    )
    signal = existing.scalar_one_or_none()

    if signal:
        cumulative_dwell = signal.total_dwell_secs + body.total_dwell_secs
        best_scroll      = max(signal.max_scroll_depth, body.max_scroll_depth)
        signal.total_dwell_secs = cumulative_dwell
        signal.max_scroll_depth = best_scroll
        signal.sections_visited = list(set((signal.sections_visited or []) + body.sections_visited))
        signal.stayed_in_app    = body.stayed_in_app
        signal.completed        = signal.completed or body.completed  # never un-complete
        signal.last_read_at     = datetime.now(timezone.utc)
    else:
        cumulative_dwell = body.total_dwell_secs
        best_scroll      = body.max_scroll_depth
        signal = PaperSignal(
            user_id=session.user_id,
            paper_id=session.paper_id,
            total_dwell_secs=cumulative_dwell,
            max_scroll_depth=best_scroll,
            sections_visited=body.sections_visited,
            stayed_in_app=body.stayed_in_app,
            completed=body.completed,
            last_read_at=datetime.now(timezone.utc),
        )
        db.add(signal)

    # Score uses cumulative dwell so re-reading a paper can only improve the signal
    normalized_dwell = min(cumulative_dwell / (page_count * 30), 1.0)  # ~30s per page as ceiling
    score = round(normalized_dwell * best_scroll * in_app_multiplier, 4)
    signal.signal_score = score

    # ── Write section_signals ─────────────────────────────────────────────────
    for section, dwell_secs in body.section_dwells.items():
        if not section or dwell_secs <= 0:
            continue
        existing_ss = await db.execute(
            select(SectionSignal).where(
                SectionSignal.user_id  == session.user_id,
                SectionSignal.paper_id == session.paper_id,
                SectionSignal.section  == section,
            )
        )
        ss = existing_ss.scalar_one_or_none()
        if ss:
            ss.dwell_secs  += dwell_secs
            ss.visit_count += 1
        else:
            db.add(SectionSignal(
                user_id=session.user_id,
                paper_id=session.paper_id,
                section=section,
                dwell_secs=dwell_secs,
                visit_count=1,
            ))

    await db.commit()
    return {"signal_score": score}
