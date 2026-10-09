from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class ProjectIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    account_id: UUID
    conn_id: UUID
    board_id: int
    board_name: str = Field(max_length=160)
    from_sprint: str | None = None
    managers: list[UUID] = Field(default_factory=list)


class ProjectOut(BaseModel):
    id: UUID
    name: str
    account_id: UUID
    account: str
    conn_id: UUID | None
    board_id: int | None
    board_name: str | None
    from_sprint: str | None
    managers: list[UUID]
