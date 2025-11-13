"""Database session management."""

from collections.abc import AsyncGenerator
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ada.config import get_settings

settings = get_settings()

# Create async engine with appropriate settings
engine_kwargs = {
    "echo": settings.debug,
}

# Only add pool settings for PostgreSQL (not SQLite)
if "postgresql" in settings.database_url or "postgres" in settings.database_url:
    engine_kwargs.update({
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
        "pool_pre_ping": True,
    })

engine = create_async_engine(
    str(settings.database_url),
    **engine_kwargs,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    from ada.database.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
