"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, TableProperties } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";

import { BoardView } from "@/components/board/board-view";
import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { LightBadge } from "@/components/panel/light-badge";
import { PageHeader } from "@/components/panel/page-header";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty } from "@/components/viz/empty";
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
      <PageHeader
        back={{ href: "/", label: "Panel de cartera" }}
        eyebrow={proj?.account ?? " "}
        title={proj?.name ?? "Proyecto"}
        description={
          last
            ? `Último sprint cerrado: ${last.name} · ${pct(last.pct)} (${pts(last.burned)}/${pts(last.planned)} pts)`
            : "Sin sprints cerrados todavía"
        }
        actions={
          <Button variant="secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            <RefreshCw className={refresh.isPending ? "size-4 animate-spin" : "size-4"} />
            Recalcular
          </Button>
        }
      />

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
            <Card>
              <ErrorState
                message={`No se pudo calcular: ${comp.error.message}`}
                onRetry={() => comp.refetch()}
              />
            </Card>
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
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle>Sprints</CardTitle>
                      <ExportButtons
                        name={`sprints-${proj?.name ?? "proyecto"}`}
                        section="sprints"
                        cols={sprintCols}
                        rows={sprints}
                      />
                    </CardHeader>
                    <CardContent>
                      {sprints.length === 0 ? (
                        <Empty
                          icon={TableProperties}
                          title="Todavía no hay sprints"
                          hint="Cuando el board tenga sprints, aparecen acá."
                        />
                      ) : (
                        <SprintTable project={id} rows={sprints} />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="personas">
                  <Card data-section="personas">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>Por persona</CardTitle>
                        <NativeSelect
                          className="w-auto"
                          value={selected?.id}
                          onChange={(e) => setPersonSprint(e.target.value)}
                          aria-label="Sprint"
                        >
                          {[...sprints].reverse().map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </NativeSelect>
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
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle>Por mes</CardTitle>
                      <ExportButtons
                        name={`meses-${proj?.name ?? "proyecto"}`}
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
