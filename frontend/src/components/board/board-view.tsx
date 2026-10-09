"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type SprintBoard, type Ticket } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, pct, pts } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrandBar } from "@/components/viz/brand-bar";
import { Gauge } from "@/components/viz/gauge";
import { PACE_CHIP, pace, type PaceTone } from "@/components/viz/pace";

import { BoardDonut } from "./board-donut";
import { LANES, LANE_ORDER, type LaneKey } from "./lanes";
import { TicketDialog } from "./ticket-dialog";

const ALL = "";

const cols: Col<Ticket>[] = [
  { label: "Issue", value: (t) => t.key },
  { label: "Título", value: (t) => t.title },
  { label: "Carril", value: (t) => LANES[t.lane as LaneKey].label },
  { label: "Estado", value: (t) => t.status },
  { label: "Responsable", value: (t) => t.assignee ?? "Sin asignar" },
  { label: "Tipo", value: (t) => t.type },
  { label: "Prioridad", value: (t) => t.priority },
  { label: "SP", value: (t) => t.sp ?? "" },
];

export function BoardView({ project }: { project: string }) {
  const [open, setOpen] = useState<Ticket | null>(null);
  const [who, setWho] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [text, setText] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tablero", project],
    queryFn: () => api<SprintBoard>(`/proyectos/${project}/tablero`),
    refetchInterval: 60_000, // sin botón de actualizar
  });

  const cards = useMemo(() => data?.cards ?? [], [data]);
  const people = useMemo(
    () => [...new Set(cards.map((c) => c.assignee ?? "Sin asignar"))].sort(),
    [cards],
  );
  const types = useMemo(() => [...new Set(cards.map((c) => c.type))].sort(), [cards]);
  const shown = cards.filter(
    (c) =>
      (!who || (c.assignee ?? "Sin asignar") === who) &&
      (!type || c.type === type) &&
      (!text || `${c.key} ${c.title}`.toLowerCase().includes(text.toLowerCase())),
  );

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (error)
    return (
      <Card>
        <ErrorState
          message={`No se pudo cargar el tablero: ${error.message}`}
          onRetry={() => refetch()}
        />
      </Card>
    );
  if (!data) return null;

  const { sprint, counts } = data;
  const tiles = [
    { label: "Total", value: counts.total, dot: "bg-primary" },
    ...LANE_ORDER.map((k) => ({ label: LANES[k].label, value: counts[k], dot: LANES[k].dot })),
  ];

  return (
    <div className="grid gap-4">
      {data.notice && (
        <p className="flex items-center gap-2 rounded-lg border bg-warn-bg p-3 text-sm text-warn-fg">
          <Info className="size-4" /> {data.notice}
        </p>
      )}

      {sprint && <SprintHeader sprint={sprint} done={data.done_pct ?? 0} />}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Resumen del tablero">
        {tiles.map((t) => (
          <Card key={t.label} className="py-4">
            <CardContent>
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className={cn("size-2 rounded-full", t.dot)} aria-hidden /> {t.label}
              </p>
              <p className="text-3xl leading-none font-bold tabular-nums">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card data-section="tablero">
          <CardHeader className="flex flex-row flex-wrap items-center gap-2">
            <CardTitle className="mr-auto">Issues del sprint</CardTitle>
            <div className="relative w-full sm:w-auto print:hidden">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-full pl-8 sm:w-44"
                placeholder="Buscar…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Buscar issue"
              />
            </div>
            <NativeSelect
              className="w-full sm:w-auto"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              aria-label="Responsable"
            >
              <option value={ALL}>Todos</option>
              {people.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </NativeSelect>
            <NativeSelect
              className="w-full sm:w-auto"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Tipo"
            >
              <option value={ALL}>Todos los tipos</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
            <ExportButtons
              name={`tablero-${sprint?.name}`}
              section="tablero"
              cols={cols}
              rows={shown}
            />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kanban">
              <TabsList className="print:hidden">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="tabla">Tabla</TabsTrigger>
              </TabsList>
              <TabsContent value="kanban">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {LANE_ORDER.map((k) => {
                    const lane = shown.filter((c) => c.lane === k);
                    return (
                      <section
                        key={k}
                        className="grid content-start gap-2 rounded-xl bg-muted/50 p-2"
                      >
                        <h3 className="flex items-center justify-between px-1 text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            <span
                              className={cn("size-2.5 rounded-full", LANES[k].dot)}
                              aria-hidden
                            />
                            {LANES[k].label}
                          </span>
                          <span className="text-muted-foreground">{lane.length}</span>
                        </h3>
                        {lane.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setOpen(c)}
                            className="grid gap-1 rounded-lg border bg-card p-3 text-left text-sm shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="flex justify-between text-xs text-muted-foreground">
                              {c.key} · {c.type}
                              {c.sp !== null && (
                                <span className="font-semibold text-foreground">
                                  {pts(c.sp)} SP
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-2 font-medium">{c.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.assignee ?? "Sin asignar"}
                            </span>
                          </button>
                        ))}
                        {lane.length === 0 && (
                          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                            Sin issues
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="tabla">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Carril</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead className="text-right">SP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((c) => (
                      <TableRow key={c.key} className="cursor-pointer" onClick={() => setOpen(c)}>
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            onClick={() => setOpen(c)}
                            className="rounded-sm text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {c.key}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{c.title}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn("size-2 rounded-full", LANES[c.lane as LaneKey].dot)}
                            />
                            {LANES[c.lane as LaneKey].label}
                          </span>
                        </TableCell>
                        <TableCell>{c.assignee ?? "Sin asignar"}</TableCell>
                        <TableCell>{c.priority}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.sp === null ? "—" : pts(c.sp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución</CardTitle>
          </CardHeader>
          <CardContent>
            <BoardDonut cards={shown} />
          </CardContent>
        </Card>
      </div>

      <TicketDialog ticket={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function SprintHeader({
  sprint,
  done,
}: {
  sprint: NonNullable<SprintBoard["sprint"]>;
  done: number;
}) {
  const p = pace(done, sprint.time_pct);
  return (
    <Card className="overflow-hidden">
      <div className="bg-brand h-1" aria-hidden />
      <CardContent className="grid gap-6 pt-2 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {day(sprint.start)} – {day(sprint.end)}
            </p>
            <p className="text-xl font-semibold">{sprint.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
              Día {sprint.day} de {sprint.days} hábiles
            </span>
            <span className={cn("rounded-full border px-3 py-1 font-semibold", PACE_CHIP[p.tone])}>
              {p.label}
            </span>
          </div>
          <div className="grid gap-2">
            <BarRow label="Tiempo transcurrido" value={sprint.time_pct} tone="brand" />
            <BarRow label="Tarjetas finalizadas" value={done} tone={p.tone} />
          </div>
        </div>
        <div className="flex justify-center gap-6">
          <Gauge value={sprint.time_pct} label="Tiempo" tone="brand" />
          <Gauge value={done} label="Finalizadas" tone={p.tone} />
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | PaceTone;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{pct(value)}</span>
      </div>
      <BrandBar value={value} label={label} tone={tone} />
    </div>
  );
}
