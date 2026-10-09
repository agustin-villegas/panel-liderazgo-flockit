from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    kind: str
    title: str
    body: str
    link: str
    created_at: datetime
    read_at: datetime | None


class NotificationsOut(BaseModel):
    items: list[NotificationOut]
    unread: int


class JobOut(BaseModel):
    projects: int
    created: int
