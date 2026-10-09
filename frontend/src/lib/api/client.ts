import type { components } from "./schema";

type S = components["schemas"];
export type Me = S["Me"];
export type Card = S["CardOut"];
export type Compliance = S["ComplianceOut"];
export type SprintRow = S["SprintOut"];
export type MonthRow = S["MonthOut"];
export type Detail = S["DetailOut"];
export type Line = S["LineOut"];
export type Conn = S["ConnOut"];
export type ConnIn = S["ConnIn"];
export type TestOut = S["TestOut"];
export type Board = S["BoardOut"];
export type Account = S["AccountOut"];
export type Project = S["ProjectOut"];
export type ProjectIn = S["ProjectIn"];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Fetch a /api (mismo dominio: Next lo reenvía al backend). */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    // fuera de un componente no hay router: recarga completa al login
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? detail(body) ?? "Algo salió mal");
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// errores de validación de FastAPI (422)
function detail(body: { detail?: { msg: string }[] } | null): string | undefined {
  return body?.detail?.[0]?.msg?.replace(/^Value error, /, "");
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = (path: string) => api<void>(path, { method: "DELETE" });
