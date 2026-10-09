"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { LightBadge } from "@/components/panel/light-badge";
import { PageHeader } from "@/components/panel/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Detail, type Line } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, pct, pts, type Light } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 25;

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

type Props = { project: string; sprint: string };

/** Auditoría del sprint: filtros, tarjetas por estado y tabla paginada. */
export function SprintReport({ project, sprint }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [who, setWho] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sprint", project, sprint],
    queryFn: () => api<Detail>(`/proyectos/${project}/sprints/${sprint}`),
  });

  const lines = data?.lines;
  const statuses = useMemo(() => group(lines ?? []), [lines]);
  const people = useMemo(
    () => uniq((lines ?? []).map((l) => l.assignee ?? "Sin asignar")),
    [lines],
  );
  const reasons = useMemo(() => uniq((lines ?? []).map((l) => l.reason)), [lines]);

  const filtered = (lines ?? []).filter((l) => {
    const text = `${l.key} ${l.title}`.toLowerCase();
    if (q && !text.includes(q.trim().toLowerCase())) return false;
    if (status && l.status !== status) return false;
    if (who && (l.assignee ?? "Sin asignar") !== who) return false;
    if (reason && l.reason !== reason) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * PAGE, current * PAGE + PAGE);

  function pickStatus(name: string) {
    setStatus((cur) => (cur === name ? "" : name));
    setPage(0);
  }

  return (
    <div className="grid gap-6">
      <Link
        href={`/proyectos/${project}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al proyecto
      </Link>

      {error && (
        <Card>
          <ErrorState
            message={`No se pudo abrir el sprint: ${error.message}`}
            onRetry={() => refetch()}
          />
        </Card>
      )}
      {isLoading && <Skeleton className="h-96 rounded-xl" />}

      {data && (
        <>
          <PageHeader
            title={data.sprint.name}
            description={
              <div className="grid gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <LightBadge
                    light={data.sprint.light as Light}
                    className="border-white/30 bg-white/15 text-white"
                  />
                  {day(data.sprint.start)} – {day(data.sprint.end)} · {pts(data.sprint.burned)} de{" "}
                  {pts(data.sprint.planned)} puntos quemados · {pct(data.sprint.pct)}
                </p>
                <p className="max-w-3xl text-sm text-white/90">
                  <span className="font-semibold">Objetivo del sprint. </span>
                  {data.sprint.goal || "Jira no tiene un objetivo cargado para este sprint."}
                </p>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {statuses.map(([name, g]) => {
              const tone = TONE[toneOf(name)];
              const on = status === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => pickStatus(name)}
                  aria-pressed={on}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-3 pl-4 text-left text-sm transition-shadow hover:shadow-md",
                    tone.card,
                    on && "ring-2 ring-primary",
                  )}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} aria-hidden />
                  <p className={cn("font-semibold", tone.label)}>{name}</p>
                  <p className="text-muted-foreground">
                    {g.n} {g.n === 1 ? "issue" : "issues"} · {pts(g.sp)} SP
                  </p>
                </button>
              );
            })}
          </div>

          <Card className="gap-0 overflow-hidden py-0" data-section="auditoria">
            <span className="bg-brand h-1" aria-hidden />
            <CardContent className="grid gap-3 py-4">
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Buscar clave o título"
                  aria-label="Buscar issue"
                  className="w-full sm:w-56"
                />
                <NativeSelect
                  className="w-full sm:w-auto"
                  value={who}
                  aria-label="Responsable"
                  onChange={(e) => {
                    setWho(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Todos los responsables</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  className="w-full sm:w-auto"
                  value={reason}
                  aria-label="Motivo"
                  onChange={(e) => {
                    setReason(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Todos los motivos</option>
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </NativeSelect>
                <div className="ml-auto">
                  <ExportButtons
                    name={`auditoria-${data.sprint.name}`}
                    section="auditoria"
                    cols={cols}
                    rows={filtered}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">SP</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Pasó por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="print:hidden">
                  <Rows lines={slice} site={data.site} />
                </TableBody>
                <TableBody className="hidden print:table-row-group">
                  <Rows lines={filtered} site={data.site} />
                </TableBody>
              </Table>

              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin issues que coincidan con el filtro.
                </p>
              )}

              <div className="flex items-center justify-between text-sm print:hidden">
                <p className="text-muted-foreground">
                  {filtered.length === 0
                    ? "0 issues"
                    : `${current * PAGE + 1}–${Math.min((current + 1) * PAGE, filtered.length)} de ${filtered.length}`}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft className="size-4" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current >= pages - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    Siguiente <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Rows({ lines, site }: { lines: Line[]; site?: string | null }) {
  return lines.map((l) => (
    <TableRow key={l.key}>
      <TableCell className="font-medium whitespace-nowrap text-primary">
        {site ? (
          <a
            href={`${site}/browse/${l.key}`}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {l.key}
          </a>
        ) : (
          l.key
        )}
      </TableCell>
      <TableCell className="max-w-md whitespace-normal">{l.title}</TableCell>
      <TableCell className={cn("font-medium whitespace-nowrap", TONE[toneOf(l.status)].label)}>
        {l.status}
      </TableCell>
      <TableCell className="whitespace-nowrap">{l.assignee ?? "Sin asignar"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {l.sp === null ? "sin estimar" : pts(l.sp)}
      </TableCell>
      <TableCell className="whitespace-normal">{l.reason}</TableCell>
      <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
        {l.sprints.join(" → ")}
      </TableCell>
    </TableRow>
  ));
}

const TONE = {
  done: { card: "border-done/40 bg-done/15", bar: "bg-done", label: "text-done" },
  doing: { card: "border-doing/40 bg-doing/15", bar: "bg-doing", label: "text-doing" },
  todo: { card: "border-todo/50 bg-todo/15", bar: "bg-todo", label: "text-foreground" },
  warn: { card: "border-warn/40 bg-warn-bg", bar: "bg-warn", label: "text-warn-fg" },
  blocked: { card: "border-blocked/40 bg-blocked/15", bar: "bg-blocked", label: "text-blocked" },
} as const;

function toneOf(name: string): keyof typeof TONE {
  const n = name.toLowerCase();
  if (/final|done|cerrad|hech|resuelt/.test(n)) return "done";
  if (/qa|review|revis/.test(n)) return "warn";
  if (/curso|progres|doing|desarrollo/.test(n)) return "doing";
  if (/bloq|imped/.test(n)) return "blocked";
  return "todo";
}

function group(lines: Line[]) {
  const map = new Map<string, { n: number; sp: number }>();
  for (const l of lines) {
    const cur = map.get(l.status) ?? { n: 0, sp: 0 };
    cur.n += 1;
    cur.sp += l.sp ?? 0;
    map.set(l.status, cur);
  }
  return [...map.entries()].sort((a, b) => b[1].sp - a[1].sp);
}

function uniq(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"));
}
