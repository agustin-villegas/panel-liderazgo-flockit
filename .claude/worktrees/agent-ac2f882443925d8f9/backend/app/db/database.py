from collections.abc import AsyncIterator
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool


class Base(DeclarativeBase):
    pass


class Database:
    """Engine + fábrica de sesiones. Una instancia por app."""

    def __init__(self, url: str) -> None:
        args: dict = {}
        if url.startswith("postgresql+asyncpg"):
            # pooler de Supabase (pgbouncer): sin caché de statements
            args = {
                "statement_cache_size": 0,
                "prepared_statement_name_func": lambda: f"__stmt_{uuid4()}__",
            }
        self.engine = create_async_engine(url, poolclass=NullPool, connect_args=args)
        self.maker = async_sessionmaker(self.engine, expire_on_commit=False)

    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.maker() as db:
            yield db

    async def create_all(self) -> None:
        # Solo tests/local. En la base real se usan las migraciones SQL.
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        await self.engine.dispose()
