---
name: python
description: >
  Python moderno con type hints, calidad de código, Pydantic y buenas prácticas.
  Trigger: crear script Python, crear clase Python, refactorizar Python, Pydantic, FastAPI, agregar tipos Python
license: MIT
metadata:
  author: flock-engineering
  version: '1.0'
  scope: [root]
  auto_invoke:
    - 'Crear script Python'
    - 'Crear clase Python'
    - 'Refactorizar Python'
    - 'Agregar tipos Python'
    - 'Pydantic'
    - 'FastAPI'
    - 'Mejorar calidad Python'
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Python Skill

> Fuente: catálogo de skills de Flock Tech Guides (flock-engineering, MIT).
> **Ajuste del proyecto** (ver `CLAUDE.md`): nombres cortos y simples; docstrings de **una línea**
> en funciones públicas, con `Raises:` solo si lanza errores relevantes. Herramientas: `uv run ruff`, `uv run pytest`.

## Critical Rules

### ALWAYS

- Usar **type hints** en todos los parámetros, retornos y variables no inferibles
- Usar `dataclass` o `Pydantic BaseModel` para estructuras de datos
- Usar **context managers** (`with`) para archivos, conexiones y recursos
- Nombrar variables/funciones en `snake_case`, clases en `PascalCase`, constantes en `UPPER_SNAKE`
- Manejar excepciones con tipos específicos — nunca `except Exception` sin re-raise o log
- Usar `pathlib.Path` en vez de `os.path` para rutas
- Agregar docstrings en funciones públicas (Google style)
- Usar `logging` en vez de `print` para código de producción
- Usar list/dict/set comprehensions en vez de loops con `.append()`
- Tipar colecciones: `list[str]`, `dict[str, int]`, `tuple[str, ...]` (Python 3.9+)

### NEVER

- Usar tipos mutables como valor por defecto en funciones (`def f(items=[])` → bug clásico)
- Ignorar excepciones con `except: pass` o `except Exception: pass`
- Usar `os.path` cuando `pathlib` está disponible
- Usar `print()` para logging en producción
- Hacer imports con `*` (`from module import *`)
- Usar variables globales para estado compartido — usar clases o inyección
- Concatenar strings en loops — usar `str.join()` o f-strings

---

## Funciones Tipadas

```python
def calculate_discount(
    price: float,
    discount_pct: float,
    max_discount: float = 100.0,
) -> float:
    """Calcula el precio con descuento aplicado.

    Raises:
        ValueError: Si el precio es negativo o el descuento está fuera de rango.
    """
    if price < 0:
        raise ValueError(f"El precio no puede ser negativo: {price}")
    if not 0 <= discount_pct <= 100:
        raise ValueError(f"El descuento debe estar entre 0 y 100: {discount_pct}")

    effective_discount = min(discount_pct, max_discount)
    return price * (1 - effective_discount / 100)
```

## Dataclass Pattern

```python
from dataclasses import dataclass, field

@dataclass
class User:
    id: str
    name: str
    email: str
    role: str = 'USER'
    tags: list[str] = field(default_factory=list)  # ✅ no usar [] como default

    def __post_init__(self) -> None:
        if not self.email or '@' not in self.email:
            raise ValueError(f"Email inválido: {self.email}")
```

## Pydantic v2 (validación y serialización)

```python
from pydantic import BaseModel, EmailStr, Field, field_validator

class CreateUserDto(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    email: EmailStr
    role: str = Field(default='USER', pattern=r'^(USER|ADMIN|EDITOR)$')

    @field_validator('name')
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

class UserResponse(BaseModel):
    id: str
    name: str
    model_config = {'from_attributes': True}  # permite crear desde ORM objects
```

## Manejo de Errores

```python
import logging

logger = logging.getLogger(__name__)

class AppError(Exception):
    """Error base de la aplicación."""
    def __init__(self, message: str, code: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str) -> None:
        super().__init__(f"{resource} con id '{resource_id}' no encontrado", 'NOT_FOUND', 404)

def get_user(user_id: str) -> User:
    try:
        user = db.query(User).filter_by(id=user_id).first()
    except DatabaseError as e:
        logger.error("Error consultando usuario %s: %s", user_id, e)
        raise AppError("Error de base de datos", "DB_ERROR") from e
    if user is None:
        raise NotFoundError("Usuario", user_id)
    return user
```

## Context Managers, pathlib y comprehensions

```python
from pathlib import Path
import json

def read_config(path: Path) -> dict:
    """Lee configuración desde un JSON."""
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)

active = [u.email for u in users if u.is_active]   # ✅
by_id = {u.id: u for u in users}                    # ✅
```

## Logging Correcto

```python
logger.info("Procesando usuario %s de %s", user_id, total)    # ✅ lazy
logger.error("Error en %s: %s", op, err, exc_info=True)       # ✅
logger.debug(f"User: {user}")                                 # ❌
```

## Commands (este proyecto)

```bash
cd backend
uv run ruff check . && uv run ruff format .
uv run pytest -v
```
