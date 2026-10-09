from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

DEMO = "demo"
JIRA = "jira"


class Connection(Base):
    __tablename__ = "jira_connections"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    kind: Mapped[str] = mapped_column(String(10), default=JIRA)
    site: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(254))
    token_enc: Mapped[str | None] = mapped_column(String(600))
    token_last4: Mapped[str | None] = mapped_column(String(4))
    sp_field: Mapped[str | None] = mapped_column(String(80))
    skip_subtasks: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(10), default="ok")
    last_error: Mapped[str | None] = mapped_column(String(300))
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
