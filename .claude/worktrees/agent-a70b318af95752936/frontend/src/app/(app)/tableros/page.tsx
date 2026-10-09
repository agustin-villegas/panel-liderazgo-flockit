"use client";

import { useQuery } from "@tanstack/react-query";

import { BoardSummary } from "@/components/board/board-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Project } from "@/lib/api/client";

export default function BoardsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });

  return (
    <>
      <section className="banner">
        <h1 className="text-2xl font-bold tracking-tight">Tableros de Jira</h1>
        <p className="mt-1 text-white/85">
          El sprint en curso de cada proyecto, en vivo: avance, bloqueos y quién tiene qué.
        </p>
      </section>

      {isLoading && <Skeleton className="h-64 rounded-xl" />}
      {data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No tenés proyectos asignados todavía.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <BoardSummary key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}
