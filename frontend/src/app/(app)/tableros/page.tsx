"use client";

import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";

import { BoardSummary } from "@/components/board/board-summary";
import { ErrorState } from "@/components/panel/error-state";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/viz/empty";
import { api, type Project } from "@/lib/api/client";

export default function BoardsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });

  return (
    <>
      <PageHeader
        title="Tableros de Jira"
        description="El sprint en curso de cada proyecto, en vivo: avance, bloqueos y quién tiene qué."
      />

      {isLoading && <Skeleton className="h-64 rounded-xl" />}
      {error && (
        <Card>
          <ErrorState
            message={`No se pudieron cargar los tableros: ${error.message}`}
            onRetry={() => refetch()}
          />
        </Card>
      )}
      {data?.length === 0 && (
        <Card>
          <Empty
            icon={LayoutDashboard}
            title="No tenés proyectos asignados todavía"
            hint="Pedile a un admin que te asigne proyectos."
          />
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <BoardSummary key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}
