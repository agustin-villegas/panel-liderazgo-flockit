"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Project, type SprintBoard } from "@/lib/api/client";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrandBar } from "@/components/viz/brand-bar";
import { Gauge } from "@/components/viz/gauge";
import { PACE_CHIP, pace } from "@/components/viz/pace";

import { LANES, LANE_ORDER } from "./lanes";

/** Card de un tablero en la grilla: estado del sprint activo de un proyecto. */
export function BoardSummary({ project }: { project: Project }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tablero", project.id],
    queryFn: () => api<SprintBoard>(`/proyectos/${project.id}/tablero`),
    refetchInterval: 60_000,
  });

  const p = data?.sprint ? pace(data.done_pct ?? 0, data.sprint.time_pct) : null;

  return (
    <Link
      href={`/tableros/${project.id}`}
      className="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <p className="truncate text-xs font-medium text-muted-foreground">{project.account}</p>
          <h3 className="truncate font-semibold">{project.name}</h3>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading && <Skeleton className="h-32" />}
          {error && <p className="text-sm text-crit-fg">{error.message}</p>}
          {data && (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{data.sprint?.name ?? "Sin sprint"}</span>
                {data.sprint && (
                  <span className="text-muted-foreground">
                    día {data.sprint.day} de {data.sprint.days}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-[auto_1fr] items-center gap-4">
                <Gauge
                  value={data.done_pct ?? 0}
                  label="Finalizadas"
                  tone={p?.tone ?? "brand"}
                  size={88}
                />
                <div className="grid gap-2 text-xs">
                  <Row label="Tiempo" value={data.sprint?.time_pct ?? 0} />
                  <Row label="Finalizadas" value={data.done_pct ?? 0} tone={p?.tone} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                {LANE_ORDER.map((k) => (
                  <div key={k} className="rounded-md bg-muted/60 py-1.5">
                    <p className="text-lg leading-none font-bold">{data.counts[k]}</p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", LANES[k].dot)} aria-hidden />
                      {LANES[k].label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-xs">
                {p ? (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                      PACE_CHIP[p.tone],
                    )}
                  >
                    {p.tone !== "ok" && <AlertTriangle className="size-3.5" />}
                    {p.label}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{data.counts.total} issues</span>
                )}
                <span className="flex items-center font-medium text-primary">
                  Abrir tablero <ChevronRight className="size-3.5" />
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "crit";
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct(value)}</span>
      </div>
      <BrandBar value={value} label={label} tone={tone ?? "brand"} size="sm" />
    </div>
  );
}
