from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.ai.cards import Card


class MsgIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[MsgIn] = Field(min_length=1, max_length=20)


class ChatOut(BaseModel):
    answer: str
    tools: list[str]
    cards: list[Card] = Field(default_factory=list)
    trace_id: UUID


class TokenIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class TokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    last4: str
    created_at: datetime
    last_used_at: datetime | None


class TokenNew(TokenOut):
    token: str  # se muestra una sola vez
