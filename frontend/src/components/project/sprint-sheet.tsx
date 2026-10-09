"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, CornerDownRight } from "lucide-react";

import { ExportButtons } from "@/components/panel/export-buttons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Detail, type Line, type SprintRow } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, pct, pts } from "@/lib/format";

const cols: Col<Line>[] = [
  { label: "Issue", value: (l) => l.key },
  { label: "Título", value: (l) => l.title },
  { label: "Responsable", value: (l) => l.assignee ?? "Sin asignar" },
  { label: "SP", value: (l) => l.sp ?? "sin estimar" },
  { label: "Estado", value: (l) => l.status },
  { label: "Finalizada", value: (l) => day(l.done_at) },
  { label: "Sprints", value: (l) => l.sprints.join(" → ") },
  { label: "Quema en", value: (l) => l.burn_sprint ?? "—" },
  { label: "Motivo", value: (l) => l.reason },
];

type Props = { project: string; sprint: SprintRow | null; onClose: () => void };

/** Auditoría: las issues que componen planificados y quemados del sprint. */
export function SprintSheet({ project, sprint, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["sprint", project, sprint?.id],
    queryFn: () => api<Detail>(`/proyectos/${project}/sprints/${sprint?.id}`),
    enabled: !!sprint,
  });

  return (
    <Sheet open={!!sprint} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl" data-section="auditoria">
        <SheetHeader>
          <SheetTitle>{sprint?.name}</SheetTitle>
          <SheetDescription>
            {sprint &&
              `${pts(sprint.burned)} de ${pts(sprint.planned)} puntos quemados · ${pct(sprint.pct)}`}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 px-4 pb-6">
          {data && (
            <div className="flex justify-end">
              <ExportButtons
                name={`auditoria-${sprint?.name}`}
                section="auditoria"
                cols={cols}
                rows={data.lines}
              />
            </div>
          )}
          {isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}
          {data?.lines.map((l) => (
            <article key={l.key} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.key} <span className="font-normal text-muted-foreground">· {l.status}</span>
                  </p>
                  <p className="truncate text-muted-foreground">{l.title}</p>
                </div>
                <span className="shrink-0 font-semibold">
                  {l.sp === null ? "sin estimar" : `${pts(l.sp)} SP`}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs">
                {l.burned ? (
                  <CheckCircle2 className="size-3.5 text-ok" />
                ) : l.done ? (
                  <CornerDownRight className="size-3.5 text-warn" />
                ) : (
                  <CircleDashed className="size-3.5 text-muted-foreground" />
                )}
                <span className="font-medium">{l.reason}</span>
                {l.done && l.burn_sprint && !l.burned && <span>→ {l.burn_sprint}</span>}
              </p>
              {l.sprints.length > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pasó por: {l.sprints.join(" → ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
