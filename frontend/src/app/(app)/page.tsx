"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  FolderPlus,
  Plus,
  Play,
  ShieldAlert,
  Zap,
  Building2,
} from "lucide-react";
import Link from "next/link";

import { ActiveSprintCard } from "@/components/panel/active-sprint-card";
import { ErrorState } from "@/components/panel/error-state";
import { PageHeader } from "@/components/panel/page-header";
import { PortfolioChart } from "@/components/panel/portfolio-chart";
import { ProjectBars } from "@/components/panel/project-bars";
import { IdleRow } from "@/components/panel/idle-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/viz/empty";
import { StatTile } from "@/components/viz/stat-tile";
import { useMe } from "@/hooks/use-me";
import { useNotifs } from "@/hooks/use-notifs";
import { api, type Card as CardData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function byAccount(cards: CardData[]): [string, CardData[]][] {
  const m = new Map<string, CardData[]>();
  for (const c of cards) m.set(c.account, [...(m.get(c.account) ?? []), c]);
  return [...m.entries()];
}

export default function PortfolioPage() {
  const { data: me } = useMe();
  const { data: notifs, isLoading: loadingN } = useNotifs();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["cartera"],
    queryFn: () => api<CardData[]>("/cartera"),
  });

  const count = (l: string) => data?.filter((c) => c.light === l).length ?? 0;
  const activos = data?.filter((c) => !c.error && c.active) ?? [];
  const idle = data?.filter((c) => c.error || !c.active) ?? [];
  const withTrend = data?.filter((c) => !c.error && c.trend.length > 0) ?? [];
  const kpis = [
    { label: "Sprints activos", value: activos.length, icon: Play, chip: "", loading: isLoading },
    {
      label: "En riesgo",
      value: count("crit"),
      icon: ShieldAlert,
      chip: "bg-crit-bg text-crit-fg",
      loading: isLoading,
    },
    {
      label: "Atención",
      value: count("warn"),
      icon: AlertTriangle,
      chip: "bg-warn-bg text-warn-fg",
      loading: isLoading,
    },
    {
      label: "Avisos sin leer",
      value: notifs?.unread ?? 0,
      icon: Bell,
      chip: "",
      loading: loadingN,
    },
  ];

  return (
    <>
      <PageHeader
        compact
        title="Panel"
        description={me ? `Hola ${me.name}: así vienen tus sprints.` : "Así vienen tus sprints."}
        actions={
          me && me.role !== "cliente" ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/informes/nuevo" />}
            >
              <Plus aria-hidden /> Nuevo informe
            </Button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Indicadores">
        {kpis.map((k) => (
          <StatTile key={k.label} compact {...k} />
        ))}
      </section>

      {error && (
        <Card>
          <ErrorState
            message={`No se pudo cargar la cartera: ${error.message}`}
            onRetry={() => refetch()}
          />
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
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
        <>
          <section className="grid gap-3" aria-labelledby="sec-sprints">
            <h2 id="sec-sprints" className="text-lg font-semibold">
              Sprints en curso
            </h2>
            {activos.length === 0 ? (
              <Card>
                <Empty
                  icon={Zap}
                  title="No hay sprints en curso"
                  hint="Cuando un proyecto arranque un sprint en Jira, lo vas a ver acá."
                />
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activos.map((c) => (
                  <ActiveSprintCard key={c.id} card={c} />
                ))}
              </div>
            )}
          </section>

          <div className={cn("grid gap-4", idle.length > 0 && "lg:grid-cols-2")}>
            {idle.length > 0 && (
              <Card aria-labelledby="sec-idle">
                <CardHeader>
                  <CardTitle id="sec-idle">Sin sprint en curso</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {byAccount(idle).map(([account, list]) => (
                    <div key={account} className="grid gap-1">
                      <h3 className="flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground">
                        <Building2 className="size-3.5" aria-hidden />
                        {account}
                        <span className="tabular-nums">({list.length})</span>
                      </h3>
                      {list.map((c) => (
                        <IdleRow key={c.id} card={c} />
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {withTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cumplimiento histórico</CardTitle>
                  <CardDescription>
                    {withTrend.length === 1
                      ? `Últimos sprints cerrados de ${withTrend[0].name}. “Último” es el más reciente.`
                      : "Últimos 6 sprints cerrados de cada proyecto. “Último” es el más reciente."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {withTrend.length === 1 ? (
                    <ProjectBars card={withTrend[0]} className="h-48" />
                  ) : (
                    <PortfolioChart cards={data} className="h-48" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
