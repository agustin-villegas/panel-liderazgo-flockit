"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";

import { BoardView } from "@/components/board/board-view";
import { ExportButtons } from "@/components/panel/export-buttons";
import { LightBadge } from "@/components/panel/light-badge";
import { ComplianceChart } from "@/components/project/compliance-chart";
import {
  MonthTable,
  PeopleTable,
  SprintTable,
  monthCols,
  personCols,
  sprintCols,
} from "@/components/project/tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, post, type Compliance, type Project } from "@/lib/api/client";
import { pct, pts } from "@/lib/format";

export default function ProjectPage({ params }: PageProps<"/proyectos/[id]">) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [personSprint, setPersonSprint] = useState<string | null>(null);

  const projects = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });
  const comp = useQuery({
    queryKey: ["cumplimiento", id],
    queryFn: () => api<Compliance>(`/proyectos/${id}/cumplimiento`),
  });
  const refresh = useMutation({
    mutationFn: () => post(`/proyectos/${id}/recalcular`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cumplimiento", id] });
      qc.invalidateQueries({ queryKey: ["cartera"] });
      toast.success("Datos actualizados desde Jira");
    },
    onError: (e) => toast.error(e.message),
  });

  const proj = projects.data?.find((p) => p.id === id);
  const sprints = comp.data?.sprints ?? [];
  const closed = sprints.filter((s) => !s.provisional);
  const last = closed.at(-1);
  const selected = sprints.find((s) => s.id === personSprint) ?? last;

  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel de cartera
      </Link>

      <section className="banner flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/80">{proj?.account ?? " "}</p>
          <h1 className="text-2xl font-bold tracking-tight">{proj?.name ?? "Proyecto"}</h1>
          <p className="mt-1 text-white/85">
            {last
              ? `Último sprint cerrado: ${last.name} · ${pct(last.pct)} (${pts(last.burned)}/${pts(last.planned)} pts)`
              : "Sin sprints cerrados todavía"}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="print:hidden"
        >
          <RefreshCw className={refresh.isPending ? "size-4 animate-spin" : "size-4"} />
          Recalcular
        </Button>
      </section>

      <Tabs defaultValue="cumplimiento">
        <TabsList className="print:hidden">
          <TabsTrigger value="cumplimiento">Cumplimiento</TabsTrigger>
          <TabsTrigger value="tablero">Tablero de Jira</TabsTrigger>
        </TabsList>

        <TabsContent value="tablero">
          <BoardView project={id} />
        </TabsContent>

        <TabsContent value="cumplimiento" className="grid gap-6">
          {comp.error && (
            <p className="text-sm text-crit-fg">No se pudo calcular: {comp.error.message}</p>
          )}
          {comp.isLoading && <Skeleton className="h-96 rounded-xl" />}

          {comp.data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Planificados vs quemados por sprint</CardTitle>
                </CardHeader>
                <CardContent>
                  <ComplianceChart sprints={sprints} />
                </CardContent>
              </Card>

              <Tabs defaultValue="sprints">
                <TabsList>
                  <TabsTrigger value="sprints">Por sprint</TabsTrigger>
                  <TabsTrigger value="personas">Por persona</TabsTrigger>
                  <TabsTrigger value="meses">Por mes</TabsTrigger>
                </TabsList>

                <TabsContent value="sprints">
                  <Card data-section="sprints">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Sprints</CardTitle>
                      <ExportButtons
                        name={`sprints-${proj?.name}`}
                        section="sprints"
                        cols={sprintCols}
                        rows={sprints}
                      />
                    </CardHeader>
                    <CardContent>
                      <SprintTable project={id} rows={sprints} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="personas">
                  <Card data-section="personas">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <CardTitle>Por persona</CardTitle>
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={selected?.id}
                          onChange={(e) => setPersonSprint(e.target.value)}
                          aria-label="Sprint"
                        >
                          {[...sprints].reverse().map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {selected && <LightBadge light={selected.light} />}
                      </div>
                      <ExportButtons
                        name={`personas-${selected?.name}`}
                        section="personas"
                        cols={personCols}
                        rows={selected?.people ?? []}
                      />
                    </CardHeader>
                    <CardContent>
                      <PeopleTable rows={selected?.people ?? []} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="meses">
                  <Card data-section="meses">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Por mes</CardTitle>
                      <ExportButtons
                        name={`meses-${proj?.name}`}
                        section="meses"
                        cols={monthCols}
                        rows={comp.data.months}
                      />
                    </CardHeader>
                    <CardContent>
                      <MonthTable rows={comp.data.months} />
                      <p className="mt-3 text-xs text-muted-foreground">
                        Cumplimiento del mes = suma de quemados ÷ suma de planificados de los
                        sprints que terminan en ese mes.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
