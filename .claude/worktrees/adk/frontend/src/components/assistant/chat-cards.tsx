"use client";

import { LightBadge } from "@/components/panel/light-badge";
import { Gauge } from "@/components/viz/gauge";
import type { components } from "@/lib/api/schema";
import { LIGHT, pct, pts, type Light } from "@/lib/format";
import { cn } from "@/lib/utils";

type S = components["schemas"];
export type ChatCard =
  S["SprintCard"] | S["RiskCard"] | S["TrendCard"] | S["BoardCard"] | S["IssuesCard"];

const tone = (l: string) => (l === "ok" || l === "warn" || l === "crit" ? l : "brand");
const bar = (l: string) => LIGHT[(l in LIGHT ? l : "none") as Light].bar;

/** Tarjetas del chat: los números vienen de las tools (motor), no del texto del modelo. */
export function ChatCards({ cards, wide }: { cards: ChatCard[]; wide?: boolean }) {
  return (
    <div className={cn("grid w-full gap-2", wide && cards.length > 1 && "sm:grid-cols-2")}>
      {cards.map((c, i) => (
        <CardView key={i} card={c} />
      ))}
    </div>
  );
}

function CardView({ card }: { card: ChatCard }) {
  switch (card.kind) {
    case "sprint":
      return <SprintView c={card} />;
    case "riesgo":
      return <RiskView c={card} />;
    case "tendencia":
      return <TrendView c={card} />;
    case "tablero":
      return <BoardView c={card} />;
    case "issues":
      return <IssuesView c={card} />;
    default:
      return null;
  }
}

function Shell({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <span className="bg-brand block h-1" aria-hidden />
      <div className="grid gap-3 p-3">
        <header className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{sub}</p>
          <p className="truncate font-semibold">{title}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

function SprintView({ c }: { c: S["SprintCard"] }) {
  return (
    <Shell title={c.sprint} sub={c.project}>
      <div className="flex items-center gap-4">
        <Gauge value={c.pct ?? null} label="Cumplimiento" tone={tone(c.light)} size={92} />
        <div className="grid gap-1 text-xs">
          <LightBadge light={c.light} className="w-fit" />
          <span className="text-muted-foreground">{c.state}</span>
          {c.planned !== null && c.burned !== null && (
            <span>
              <b className="text-base">{pts(c.burned ?? 0)}</b>
              <span className="text-muted-foreground"> / {pts(c.planned ?? 0)} pts quemados</span>
            </span>
          )}
        </div>
      </div>
      {c.people.length > 0 && (
        <ul className="grid gap-1.5 border-t pt-2 text-xs">
          {c.people.map((p) => (
            <li key={p.label} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-0.5">
              <span className="truncate">{p.label}</span>
              <span className="font-medium tabular-nums">{pct(p.pct)}</span>
              <Meter value={p.pct} light={p.light} className="col-span-2" />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function RiskView({ c }: { c: S["RiskCard"] }) {
  return (
    <Shell title={c.items.length ? `${c.items.length} en riesgo` : "Nada en riesgo"} sub="Cartera">
      {c.items.length === 0 && (
        <p className="text-xs text-muted-foreground">Todos los proyectos están en margen.</p>
      )}
      <ul className="grid gap-2">
        {c.items.map((r) => (
          <li
            key={r.project}
            className="flex items-center gap-3 rounded-lg border bg-background/60 p-2"
          >
            <span className={cn("h-9 w-1 shrink-0 rounded-full", bar(r.light))} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.project}</p>
              <p className="truncate text-xs text-muted-foreground">{r.sprint}</p>
            </div>
            <div className="grid justify-items-end gap-0.5">
              <span className="text-lg leading-none font-bold tabular-nums">{pct(r.pct)}</span>
              <LightBadge light={r.light} className="px-1.5 text-[10px]" />
            </div>
          </li>
        ))}
      </ul>
      {c.no_data.length > 0 && (
        <p className="text-xs text-muted-foreground">Sin datos de Jira: {c.no_data.join(", ")}</p>
      )}
    </Shell>
  );
}

function TrendView({ c }: { c: S["TrendCard"] }) {
  return (
    <Shell title={c.title} sub={c.project}>
      <div
        className="flex h-28 items-end gap-1.5"
        role="img"
        aria-label={`${c.title} de ${c.project}`}
      >
        {c.points.map((p) => {
          const v = Math.max(0, Math.min(p.pct ?? 0, 1));
          return (
            <div
              key={p.label}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] font-medium tabular-nums">{pct(p.pct)}</span>
              <div
                className={cn("w-full rounded-t-md", bar(p.light))}
                style={{ height: `${Math.max(v * 100, 4)}%` }}
                title={`${p.label}: ${pct(p.pct)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {c.points.map((p) => (
          <span
            key={p.label}
            className="flex-1 truncate text-center text-[10px] text-muted-foreground"
          >
            {p.label.replace(/^.*?(sprint\s*)/i, "S")}
          </span>
        ))}
      </div>
    </Shell>
  );
}

function BoardView({ c }: { c: S["BoardCard"] }) {
  const lanes = [
    { label: "Por hacer", n: c.todo, cls: "bg-todo" },
    { label: "En curso", n: c.doing, cls: "bg-doing" },
    { label: "Bloqueadas", n: c.blocked, cls: "bg-blocked" },
    { label: "Finalizadas", n: c.done, cls: "bg-done" },
  ];
  const total = lanes.reduce((a, l) => a + l.n, 0) || 1;
  return (
    <Shell title={c.sprint ?? "Sin sprint activo"} sub={c.project}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {lanes.map((l) => (
          <span key={l.label} className={l.cls} style={{ width: `${(l.n / total) * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {lanes.map((l) => (
          <div key={l.label} className="rounded-lg bg-muted/60 py-1.5">
            <p className="text-base leading-none font-bold">{l.n}</p>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{l.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span>
          Avance <b>{pct(c.done_pct)}</b>
        </span>
        <span className="text-right">
          Tiempo <b>{pct(c.time_pct)}</b>
        </span>
      </div>
    </Shell>
  );
}

function IssuesView({ c }: { c: S["IssuesCard"] }) {
  return (
    <Shell title={`${c.total} sin terminar`} sub={`${c.project} · ${c.sprint}`}>
      <ul className="grid gap-1.5 text-xs">
        {c.items.map((i) => (
          <li key={i.key} className="grid gap-0.5 rounded-lg border bg-background/60 px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-primary">{i.key}</span>
              <span className="ml-auto rounded bg-muted px-1.5 text-[10px]">{i.status}</span>
            </div>
            <p className="line-clamp-2">{i.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {i.assignee} ·{" "}
              {i.sp === null || i.sp === undefined ? "sin estimar" : `${pts(i.sp)} pts`}
            </p>
          </li>
        ))}
      </ul>
      {c.total > c.items.length && (
        <p className="text-[10px] text-muted-foreground">
          y {c.total - c.items.length} más en el detalle del sprint
        </p>
      )}
    </Shell>
  );
}

type MeterProps = { value: number | null | undefined; light: string; className?: string };

function Meter({ value, light, className }: MeterProps) {
  const v = Math.max(0, Math.min(value ?? 0, 1));
  return (
    <span className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn("block h-full rounded-full", bar(light))}
        style={{ width: `${v * 100}%` }}
      />
    </span>
  );
}
