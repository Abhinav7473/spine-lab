from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    seed_topics: list[str]


@router.post("/", status_code=201)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(seed_topics=body.seed_topics)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "seed_topics": user.seed_topics}


@router.get("/{user_id}")
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "seed_topics": user.seed_topics, "created_at": user.created_at}
