"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import Link from "next/link";

import { ProjectCard } from "@/components/panel/project-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-me";
import { api, type Card as CardData } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cartera"],
    queryFn: () => api<CardData[]>("/cartera"),
  });

  const count = (l: string) => data?.filter((c) => c.light === l).length ?? 0;
  const kpis = [
    {
      label: "Proyectos",
      value: data?.length ?? 0,
      num: "text-foreground",
      bar: "bg-foreground/20",
    },
    { label: "En riesgo", value: count("crit"), num: "text-crit-fg", bar: "bg-crit" },
    { label: "Atención", value: count("warn"), num: "text-warn-fg", bar: "bg-warn" },
    { label: "En margen", value: count("ok"), num: "text-ok-fg", bar: "bg-ok" },
  ];

  return (
    <>
      <section className="banner">
        <h1 className="text-2xl font-bold tracking-tight">Panel de cartera</h1>
        <p className="mt-1 text-white/85">
          Cumplimiento del último sprint cerrado de cada proyecto, calculado desde Jira.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Indicadores">
        {kpis.map((k) => (
          <Card key={k.label} className="gap-0 overflow-hidden bg-card py-0">
            <span className={cn("h-0.5", k.bar)} aria-hidden />
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className={cn("text-3xl leading-none font-bold", k.num)}>{k.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {error && (
        <p className="text-sm text-crit-fg">No se pudo cargar la cartera: {error.message}</p>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <Card className="items-center py-12 text-center">
          <CardContent className="grid justify-items-center gap-3">
            <FolderPlus className="size-10 text-muted-foreground" />
            <p className="font-semibold">Todavía no hay proyectos</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {me?.role === "admin"
                ? "Creá un proyecto y vinculalo a un board de Jira (o a la conexión Demo)."
                : "Pedile a un admin que te asigne proyectos."}
            </p>
            {me?.role === "admin" && (
              <Button nativeButton={false} render={<Link href="/configuracion/proyectos" />}>
                Crear proyecto
              </Button>
            )}
          </CardContent>
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
