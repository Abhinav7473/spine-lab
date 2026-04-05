"""
OAuth 2.0 login routes — Google and GitHub.

Setup required per provider (no cost — OAuth is free):
  Google:  console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client
  GitHub:  github.com/settings/applications/new

Set these env vars (see .env.example):
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
  APP_BASE_URL          e.g. https://spine.yourdomain.com
  JWT_SECRET            any long random string

Flow:
  GET /api/auth/google          → redirect to Google consent page
  GET /api/auth/google/callback → exchange code, upsert user, return JWT
  GET /api/auth/github          → redirect to GitHub consent page
  GET /api/auth/github/callback → exchange code, upsert user, return JWT
  POST /api/auth/logout         → client discards JWT (stateless)
"""
import secrets
import time
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

# ── JWT ───────────────────────────────────────────────────────────────────────
# Lightweight HMAC-SHA256 JWT — no extra library needed for this simple case.
# If you need refresh tokens or RS256, swap in python-jose.

import base64
import hashlib
import hmac
import json as _json

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _sign_jwt(payload: dict) -> str:
    header  = _b64url(_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body    = _b64url(_json.dumps(payload).encode())
    sig     = _b64url(
        hmac.new(settings.jwt_secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{body}.{sig}"

def _verify_jwt(token: str) -> dict:
    try:
        header, body, sig = token.split(".")
        expected = _b64url(
            hmac.new(settings.jwt_secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
        )
        if not secrets.compare_digest(sig, expected):
            raise ValueError("bad signature")
        payload = _json.loads(base64.urlsafe_b64decode(body + "=="))
        if payload.get("exp", 0) < time.time():
            raise ValueError("expired")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc))


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _upsert_oauth_user(db: AsyncSession, *, provider: str, sub: str, email: str | None) -> User:
    result = await db.execute(
        select(User).where(User.oauth_provider == provider, User.oauth_sub == sub)
    )
    user = result.scalar_one_or_none()
    if user:
        if email and not user.email:
            user.email = email
        await db.commit()
        return user

    # New user — seed topics are empty; onboarding sets them
    user = User(seed_topics=[], email=email, oauth_provider=provider, oauth_sub=sub)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _make_token(user: User) -> str:
    return _sign_jwt({
        "sub":  str(user.id),
        "exp":  int(time.time()) + 60 * 60 * 24 * 30,   # 30 days
        "email": user.email,
    })


def _redirect_with_token(token: str) -> RedirectResponse:
    """Send the JWT back to the SPA via URL fragment (not query param — never logged)."""
    return RedirectResponse(url=f"{settings.app_base_url}/#token={token}")


def _missing_config(provider: str) -> HTTPException:
    return HTTPException(
        status_code=501,
        detail=f"{provider} OAuth is not configured. "
               f"Set {provider.upper()}_CLIENT_ID and {provider.upper()}_CLIENT_SECRET in .env",
    )


# ── Google ────────────────────────────────────────────────────────────────────

_GOOGLE_AUTH_URL     = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL    = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google")
async def google_login():
    if not settings.google_client_id:
        raise _missing_config("Google")
    params = {
        "client_id":     settings.google_client_id,
        "redirect_uri":  f"{settings.app_base_url}/api/auth/google/callback",
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "online",
    }
    return RedirectResponse(url=f"{_GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_client_id:
        raise _missing_config("Google")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(_GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri":  f"{settings.app_base_url}/api/auth/google/callback",
            "grant_type":    "authorization_code",
        })
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        info_resp = await client.get(_GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        info_resp.raise_for_status()
        info = info_resp.json()

    user  = await _upsert_oauth_user(db, provider="google", sub=info["sub"], email=info.get("email"))
    token = _make_token(user)
    return _redirect_with_token(token)


# ── GitHub ────────────────────────────────────────────────────────────────────

_GITHUB_AUTH_URL     = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL    = "https://github.com/login/oauth/access_token"
_GITHUB_USERINFO_URL = "https://api.github.com/user"
_GITHUB_EMAIL_URL    = "https://api.github.com/user/emails"


@router.get("/github")
async def github_login():
    if not settings.github_client_id:
        raise _missing_config("GitHub")
    params = {
        "client_id":    settings.github_client_id,
        "redirect_uri": f"{settings.app_base_url}/api/auth/github/callback",
        "scope":        "read:user user:email",
    }
    return RedirectResponse(url=f"{_GITHUB_AUTH_URL}?{urlencode(params)}")


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if not settings.github_client_id:
        raise _missing_config("GitHub")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            _GITHUB_TOKEN_URL,
            data={
                "client_id":     settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code":          code,
                "redirect_uri":  f"{settings.app_base_url}/api/auth/github/callback",
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}

        info_resp = await client.get(_GITHUB_USERINFO_URL, headers=headers)
        info_resp.raise_for_status()
        info = info_resp.json()

        # GitHub may not expose email in main profile if private
        email = info.get("email")
        if not email:
            emails_resp = await client.get(_GITHUB_EMAIL_URL, headers=headers)
            if emails_resp.status_code == 200:
                primary = next((e for e in emails_resp.json() if e.get("primary")), None)
                email = primary["email"] if primary else None

    user  = await _upsert_oauth_user(db, provider="github", sub=str(info["id"]), email=email)
    token = _make_token(user)
    return _redirect_with_token(token)


# ── JWT dependency (wire into routes to require authentication) ───────────────
# Usage:
#   from app.routers.auth import require_jwt
#   @router.get("/protected")
#   async def handler(claims: dict = Depends(require_jwt)):
#       user_id = claims["sub"]
#
# Currently disabled on /users/* endpoints (access-code phase — no JWT in those
# requests). Enable by uncommenting the Depends(require_jwt) lines in users.py
# before going live with OAuth.

async def require_jwt(
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    """FastAPI dependency — verifies Bearer JWT and returns the decoded claims."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Expected: Authorization: Bearer <token>")
    return _verify_jwt(authorization[7:])


# ── Token verify (frontend uses this to bootstrap session) ───────────────────
# POST — never GET. JWTs in query params appear in server logs, browser history,
# and Referer headers. The token travels only in the Authorization header here.

class TokenPayload(BaseModel):
    user_id: UUID
    email:   str | None


@router.post("/me", response_model=TokenPayload)
async def get_me(
    authorization: str = Header(..., alias="Authorization"),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Expected: Authorization: Bearer <token>")
    payload = _verify_jwt(authorization[7:])
    return {"user_id": payload["sub"], "email": payload.get("email")}
