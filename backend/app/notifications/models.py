from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Notification(Base):
    """Aviso dentro de la app. Único por (usuario, dedupe_key)."""

    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("user_id", "dedupe_key", name="notif_user_key_uq"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(20))
    dedupe_key: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
