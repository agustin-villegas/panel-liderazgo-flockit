import { LIGHT, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const OK = 0.85;
const WARN = 0.7;

const tone = (v: number | null) =>
  v === null
    ? LIGHT.none.bar
    : v >= OK
      ? LIGHT.ok.bar
      : v >= WARN
        ? LIGHT.warn.bar
        : LIGHT.crit.bar;

/** Mini barras de cumplimiento de los últimos sprints cerrados. */
export function TrendBars({ values }: { values: (number | null)[] }) {
  return (
    <div
      className="flex h-12 items-end justify-end gap-1.5"
      role="img"
      aria-label={`Tendencia: ${values.map(pct).join(", ")}`}
    >
      {values.map((v, i) => (
        // pista gris = 100%; la barra muestra el cumplimiento
        <div key={i} title={pct(v)} className="flex h-full w-2.5 items-end rounded-full bg-muted">
          <div
            className={cn("w-full rounded-full", tone(v))}
            style={{ height: `${Math.max((v ?? 0) * 100, 8)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
