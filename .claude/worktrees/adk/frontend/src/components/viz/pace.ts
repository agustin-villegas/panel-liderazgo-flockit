export type PaceTone = "ok" | "warn" | "crit";

/** Ritmo del sprint: % finalizado contra % de tiempo hábil transcurrido. */
export function pace(done: number, time: number): { tone: PaceTone; label: string; gap: number } {
  const gap = Math.round((done - time) * 100);
  if (gap >= -5) return { tone: "ok", label: gap > 5 ? `Adelantado ${gap} pts` : "En línea", gap };
  if (gap >= -15) return { tone: "warn", label: `Algo atrasado (${gap} pts)`, gap };
  return { tone: "crit", label: `Atrasado (${gap} pts)`, gap };
}

export const PACE_CHIP: Record<PaceTone, string> = {
  ok: "bg-ok-bg text-ok-fg border-ok/30",
  warn: "bg-warn-bg text-warn-fg border-warn/30",
  crit: "bg-crit-bg text-crit-fg border-crit/30",
};
