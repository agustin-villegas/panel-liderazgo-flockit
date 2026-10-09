import re
from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from app.auth.models import Role
from app.auth.schemas import PWD_MIN

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s.]+$")


class UserBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: str = Field(max_length=254)
    role: Role

    @field_validator("first_name", "last_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Email inválido")
        return v


class UserIn(UserBase):
    password: str = Field(min_length=PWD_MIN, max_length=200)
    password_confirm: str = Field(max_length=200)

    @model_validator(mode="after")
    def _same(self) -> Self:
        if self.password != self.password_confirm:
            raise ValueError("Las contraseñas no coinciden")
        return self


class UserPatch(UserBase):
    """Edición: la contraseña es opcional (vacía = no cambia)."""

    password: str | None = Field(default=None, max_length=200)
    password_confirm: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _pwd(self) -> Self:
        if not self.password and not self.password_confirm:
            self.password = self.password_confirm = None
            return self
        if not self.password or len(self.password) < PWD_MIN:
            raise ValueError(f"La contraseña debe tener al menos {PWD_MIN} caracteres")
        if self.password != self.password_confirm:
            raise ValueError("Las contraseñas no coinciden")
        return self


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    role: str
    active: bool
    last_login_at: datetime | None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def first_name(self) -> str:
        return self.name.partition(" ")[0]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def last_name(self) -> str:
        return self.name.partition(" ")[2]
