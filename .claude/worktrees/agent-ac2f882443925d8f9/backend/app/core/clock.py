from datetime import UTC, datetime


def now() -> datetime:
    return datetime.now(UTC)


def utc(dt: datetime) -> datetime:
    # SQLite devuelve fechas naive; Postgres con tz. Normalizamos a UTC.
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt
