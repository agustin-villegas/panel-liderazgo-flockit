from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Report(Base):
    """Informe guardado: foto inmutable (en Postgres un trigger bloquea UPDATE)."""

    __tablename__ = "reports"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    kind: Mapped[str] = mapped_column(String(20), default="sprint")
    audience: Mapped[str] = mapped_column(String(20))
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    sprint_id: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(200))
    data: Mapped[dict] = mapped_column(JSON)
    story: Mapped[dict | None] = mapped_column(JSON)
    ai_model: Mapped[str | None] = mapped_column(String(60))
    ai_tokens: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
