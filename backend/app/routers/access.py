from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import UserAccess

router = APIRouter(prefix="/access", tags=["access"])


class AccessValidate(BaseModel):
    code: str


@router.post("/validate")
async def validate_access(body: AccessValidate, db: AsyncSession = Depends(get_db)):
    """
    Validate an access code. Returns the role granted.

    Precedence:
    1. DEV_ACCESS_CODE env var — always 'dev', never stored in DB.
    2. user_access table — role as configured per row.
    """
    code = body.code.strip()

    # Dev code via env — checked first so it works even before the table exists
    if settings.dev_access_code and code == settings.dev_access_code:
        return {"valid": True, "role": "dev"}

    # Check DB table
    result = await db.execute(select(UserAccess).where(UserAccess.code == code))
    access = result.scalar_one_or_none()

    if not access:
        raise HTTPException(status_code=403, detail="Invalid access code")

    # Record first use timestamp
    if not access.used_at:
        access.used_at = datetime.now(timezone.utc)
        await db.commit()

    return {"valid": True, "role": access.role}
