"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandBar } from "@/components/viz/brand-bar";
import { PACE_CHIP, pace } from "@/components/viz/pace";
import { api, type Card as CardData, type SprintBoard } from "@/lib/api/client";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

import { LightBadge } from "./light-badge";

type Counts = SprintBoard["counts"];

const LANES: { key: keyof Counts; label: string; cls: string }[] = [
  { key: "todo", label: "Por hacer", cls: "text-foreground" },
  { key: "doing", label: "En curso", cls: "text-primary" },
  { key: "blocked", label: "Bloqueadas", cls: "text-crit-fg" },
  { key: "done", label: "Hechas", cls: "text-ok-fg" },
];

function Mini({ counts }: { counts: Counts }) {
  const lanes = LANES.filter((l) => l.key !== "blocked" || counts.blocked > 0);
  return (
    <dl className="flex gap-2" aria-label="Mini tablero">
      {lanes.map((l) => (
        <div key={l.key} className="min-w-0 flex-1 rounded-lg bg-muted/60 px-2 py-1.5">
          <dt className="truncate text-[11px] text-muted-foreground">{l.label}</dt>
          <dd className={cn("text-lg leading-tight font-bold tabular-nums", l.cls)}>
            {counts[l.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Bar({ label, v, tone }: { label: string; v: number; tone?: "ok" | "warn" | "crit" }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <BrandBar value={v} label={label} tone={tone ?? "brand"} size="sm" />
      <span className="text-right font-semibold tabular-nums">{pct(v)}</span>
    </div>
  );
}

/** Card compacta de un sprint activo; toda la card lleva al tablero. */
export function ActiveSprintCard({ card }: { card: CardData }) {
  const { active } = card;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tablero", card.id],
    queryFn: () => api<SprintBoard>(`/proyectos/${card.id}/tablero`),
    refetchInterval: 60_000,
  });
  if (!active) return null;

  const sp = data?.sprint ?? null;
  const done = data?.done_pct ?? active.pct ?? 0;
  const p = sp ? pace(done, sp.time_pct) : null;

  return (
    <Card className="lift relative gap-3 py-3 focus-within:ring-2 focus-within:ring-ring hover:ring-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-semibold">
            <Link
              href={`/tableros/${card.id}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
              aria-label={`Ver tablero de ${card.name}`}
            >
              {card.name}
            </Link>
          </h3>
          <Badge variant="outline" className="min-w-0 shrink">
            <Building2 aria-hidden />
            <span className="truncate">{card.account}</span>
          </Badge>
        </div>
        <LightBadge light={card.light} />
      </div>

      <div className="grid gap-2.5 px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium">
            {active.name} · día {sp?.day ?? active.day}/{sp?.days ?? active.days}
          </span>
          {p && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                PACE_CHIP[p.tone],
              )}
            >
              {p.label}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Bar label="Avance" v={done} tone={p?.tone} />
          {sp && <Bar label="Tiempo" v={sp.time_pct} />}
        </div>

        {isLoading && <Skeleton className="h-12 rounded-lg" aria-label="Cargando tablero" />}
        {isError && <p className="text-xs text-muted-foreground">No se pudo leer el tablero</p>}
        {data && <Mini counts={data.counts} />}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 text-xs">
        <span className="font-medium text-primary">Ver tablero</span>
        <Link
          href={`/proyectos/${card.id}`}
          className="relative z-10 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Ver cumplimiento de ${card.name}`}
        >
          Ver cumplimiento
        </Link>
      </div>
    </Card>
  );
}
