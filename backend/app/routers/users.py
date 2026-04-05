from datetime import date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import cast, func, select
from sqlalchemy.types import Date as SADate
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User, ReadingSession

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    seed_topics: list[str]


class PreferencesUpdate(BaseModel):
    seed_topics:  list[str] | None = None
    reading_mode: str | None = None   # 'skim' | 'full'
    pdf_view:     str | None = None   # 'scroll' | 'page'
    theme:        str | None = None   # 'dark' | 'light'


@router.post("/", status_code=201)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(seed_topics=body.seed_topics)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "seed_topics": user.seed_topics, "preferences": user.preferences}


@router.get("/{user_id}")
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":          user.id,
        "seed_topics": user.seed_topics,
        "email":       user.email,
        "preferences": user.preferences or {},
        "created_at":  user.created_at,
    }


@router.get("/{user_id}/activity")
async def get_activity(
    user_id: UUID,
    days: int = Query(default=90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    # TODO: enable before OAuth launch → _claims: dict = Depends(require_jwt)
):
    """
    Returns per-day session counts for the last N days.
    Used to render the GitHub-style contribution calendar in the sidebar.
    """
    cutoff = date.today() - timedelta(days=days - 1)

    rows = (await db.execute(
        select(
            cast(ReadingSession.started_at, SADate).label("d"),
            func.count().label("n"),
        )
        .where(ReadingSession.user_id == user_id)
        .where(cast(ReadingSession.started_at, SADate) >= cutoff)
        .group_by(cast(ReadingSession.started_at, SADate))
    )).all()

    counts = {str(r.d): r.n for r in rows}

    # Fill every day in range with 0 if no sessions
    result = []
    for i in range(days):
        d = str(cutoff + timedelta(days=i))
        result.append({"date": d, "count": counts.get(d, 0)})

    return result


@router.patch("/{user_id}/preferences")
async def update_preferences(
    user_id: UUID,
    body: PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    # TODO: enable before OAuth launch → _claims: dict = Depends(require_jwt)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Merge provided fields into existing preferences
    prefs = dict(user.preferences or {})
    if body.seed_topics  is not None: prefs["topics"]       = body.seed_topics
    if body.reading_mode is not None: prefs["reading_mode"] = body.reading_mode
    if body.pdf_view     is not None: prefs["pdf_view"]     = body.pdf_view
    if body.theme        is not None: prefs["theme"]        = body.theme

    user.preferences = prefs

    # seed_topics on the user row also updated when topics change
    if body.seed_topics is not None:
        user.seed_topics = body.seed_topics

    await db.commit()
    return {"preferences": user.preferences, "seed_topics": user.seed_topics}
