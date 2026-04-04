"""
Admin endpoints — available only to users with role='dev'.
The frontend sends the raw access code in X-Access-Code header.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import Paper, PaperSignal, ReadingSession, User, UserAccess
from app.services.arxiv import bulk_upsert_papers, fetch_papers

router = APIRouter(prefix="/admin", tags=["admin"])


async def _require_dev(
    x_access_code: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Dependency: verify caller has dev role."""
    if not x_access_code:
        raise HTTPException(status_code=401, detail="X-Access-Code header required")

    code = x_access_code.strip()
    if settings.dev_access_code and code == settings.dev_access_code:
        return "dev"

    result = await db.execute(select(UserAccess).where(UserAccess.code == code))
    access = result.scalar_one_or_none()
    if not access or access.role != "dev":
        raise HTTPException(status_code=403, detail="Dev access required")
    return "dev"


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_dev),
):
    paper_count   = (await db.execute(select(func.count()).select_from(Paper))).scalar()
    user_count    = (await db.execute(select(func.count()).select_from(User))).scalar()
    session_count = (await db.execute(select(func.count()).select_from(ReadingSession))).scalar()
    signal_count  = (await db.execute(select(func.count()).select_from(PaperSignal))).scalar()
    latest_paper  = (await db.execute(
        select(Paper.fetched_at).order_by(Paper.fetched_at.desc()).limit(1)
    )).scalar()

    return {
        "papers":               paper_count,
        "users":                user_count,
        "sessions":             session_count,
        "signals":              signal_count,
        "last_fetch":           latest_paper,
        "reranking_threshold":  settings.min_sessions_reranking,
        "cooldown_mins":        settings.arxiv_cooldown_mins,
    }


class FetchRequest(BaseModel):
    topic: str
    max_results: int = 25


@router.post("/fetch")
async def admin_fetch(
    body: FetchRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_dev),
):
    """
    Trigger an ArXiv fetch. Respects the per-topic cooldown.
    All 25 papers are inserted in a single DB round-trip.
    """
    papers = await fetch_papers(body.topic, body.max_results)

    if not papers:
        return {
            "inserted":      0,
            "total_fetched": 0,
            "message":       "No papers returned — ArXiv may be empty for this query or topic is on cooldown.",
        }

    inserted = await bulk_upsert_papers(db, papers)
    return {"inserted": inserted, "total_fetched": len(papers)}
