"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FolderKanban, FolderPlus, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/panel/error-state";
import { PageHeader } from "@/components/panel/page-header";
import { PortfolioChart } from "@/components/panel/portfolio-chart";
import { ProjectCard } from "@/components/panel/project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/viz/empty";
import { StatTile } from "@/components/viz/stat-tile";
import { useMe } from "@/hooks/use-me";
import { api, type Card as CardData } from "@/lib/api/client";

export default function PortfolioPage() {
  const { data: me } = useMe();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["cartera"],
    queryFn: () => api<CardData[]>("/cartera"),
  });

  const count = (l: string) => data?.filter((c) => c.light === l).length ?? 0;
  const kpis = [
    { label: "Proyectos", value: data?.length ?? 0, icon: FolderKanban, chip: "" },
    {
      label: "En riesgo",
      value: count("crit"),
      icon: ShieldAlert,
      chip: "bg-crit-bg text-crit-fg",
    },
    {
      label: "Atención",
      value: count("warn"),
      icon: AlertTriangle,
      chip: "bg-warn-bg text-warn-fg",
    },
    { label: "En margen", value: count("ok"), icon: CheckCircle2, chip: "bg-ok-bg text-ok-fg" },
  ];

  return (
    <>
      <PageHeader
        title="Panel de cartera"
        description="Cumplimiento del último sprint cerrado de cada proyecto, calculado desde Jira."
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Indicadores">
        {kpis.map((k) => (
          <StatTile key={k.label} {...k} loading={isLoading} />
        ))}
      </section>

      {data && data.some((c) => c.trend.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Cartera: cumplimiento por sprint</CardTitle>
            <CardDescription>
              Últimos 6 sprints cerrados de cada proyecto. “Último” es el más reciente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioChart cards={data} />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState
            message={`No se pudo cargar la cartera: ${error.message}`}
            onRetry={() => refetch()}
          />
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[17.5rem] rounded-xl" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <Card>
          <Empty
            icon={FolderPlus}
            title="Todavía no hay proyectos"
            hint={
              me?.role === "admin"
                ? "Creá un proyecto y vinculalo a un board de Jira (o a la conexión Demo)."
                : "Pedile a un admin que te asigne proyectos."
            }
          >
            {me?.role === "admin" && (
              <Button nativeButton={false} render={<Link href="/configuracion/proyectos" />}>
                Crear proyecto
              </Button>
            )}
          </Empty>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <ProjectCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </>
  );
}
