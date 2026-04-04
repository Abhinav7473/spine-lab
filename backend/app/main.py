import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Paper
from app.routers import access, admin, feed, papers, sessions, users
from app.services.arxiv import bulk_upsert_papers, fetch_papers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Default seed topics for cold-start population
_SEED_TOPICS = [
    "transformer architecture attention",
    "diffusion models image generation",
    "reinforcement learning from human feedback",
]


async def _auto_seed():
    """
    On startup: if the papers table is empty, fetch the default seed topics from ArXiv.
    Runs in a background task so it doesn't block the server from accepting requests.
    """
    await asyncio.sleep(3)  # allow DB pool to warm up
    try:
        async with SessionLocal() as db:
            count = (await db.execute(select(func.count()).select_from(Paper))).scalar()
            if count > 0:
                logger.info("Auto-seed skipped — %d papers already in DB", count)
                return

        logger.info("Papers table empty — auto-seeding from ArXiv (this may take ~30s)...")
        total = 0
        for topic in _SEED_TOPICS:
            try:
                raw = await fetch_papers(topic, max_results=20)
                async with SessionLocal() as db:
                    n = await bulk_upsert_papers(db, raw)
                total += n
                logger.info("Seeded %d new papers for topic=%r", n, topic)
                await asyncio.sleep(4)  # polite delay between topics
            except Exception as exc:
                logger.warning("Seed failed for topic=%r: %s", topic, exc)

        logger.info("Auto-seed complete — %d total papers inserted", total)
    except Exception as exc:
        logger.error("Auto-seed task crashed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_auto_seed())
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Spine API", version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ────────────────────────────────────────────────────────────────
app.include_router(access.router,   prefix="/api")
app.include_router(admin.router,    prefix="/api")
app.include_router(users.router,    prefix="/api")
app.include_router(feed.router,     prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(papers.router,   prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Frontend static files ─────────────────────────────────────────────────────
_static = Path(__file__).parent.parent / "static"

if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="frontend")
