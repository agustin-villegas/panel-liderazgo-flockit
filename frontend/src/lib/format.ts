export type Light = "ok" | "warn" | "crit" | "none";

export const LIGHT: Record<Light, { label: string; cls: string; bar: string }> = {
  ok: { label: "En margen", cls: "bg-ok-bg text-ok-fg border-ok/30", bar: "bg-ok" },
  warn: { label: "Atención", cls: "bg-warn-bg text-warn-fg border-warn/30", bar: "bg-warn" },
  crit: { label: "En riesgo", cls: "bg-crit-bg text-crit-fg border-crit/30", bar: "bg-crit" },
  none: { label: "Sin datos", cls: "bg-idle-bg text-idle-fg border-idle/30", bar: "bg-idle" },
};

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;

export const pts = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const month = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

/** "hace 5 min" / "hace 3 h" / "hace 2 d" (fechas sin zona se toman como UTC). */
export const ago = (iso: string) => {
  const t = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`).getTime();
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} d`;
};

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—";
