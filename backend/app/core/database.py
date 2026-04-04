from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Supabase gives postgresql:// — asyncpg needs postgresql+asyncpg://
_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _url,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,  # required for Supabase transaction pooler
    },
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
