from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class ConnIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    site: HttpUrl
    email: str = Field(min_length=3, max_length=254)
    token: str | None = Field(default=None, max_length=500)  # vacío al editar = conservar
    sp_field: str | None = Field(default=None, max_length=80)
    skip_subtasks: bool = True

    @field_validator("site")
    @classmethod
    def _atlassian(cls, v: HttpUrl) -> HttpUrl:
        if v.scheme != "https" or not (v.host or "").endswith(".atlassian.net"):
            raise ValueError("El site tiene que ser https://<algo>.atlassian.net")
        return v


class TestIn(BaseModel):
    site: HttpUrl
    email: str
    token: str | None = None
    conn_id: UUID | None = None  # para probar con el token guardado


class TestOut(BaseModel):
    ok: bool
    user: str | None = None
    sp_field: str | None = None
    error: str | None = None


class ConnOut(BaseModel):
    """Nunca incluye el token: solo sus últimos 4 caracteres."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    kind: str
    site: str | None
    email: str | None
    token_last4: str | None
    sp_field: str | None
    skip_subtasks: bool
    status: str
    last_error: str | None
    checked_at: datetime | None
    projects: int = 0


class FieldOut(BaseModel):
    id: str
    name: str


class BoardOut(BaseModel):
    id: int
    name: str
    key: str
