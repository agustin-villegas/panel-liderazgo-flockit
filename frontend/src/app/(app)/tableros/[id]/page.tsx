"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LineChart } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { BoardView } from "@/components/board/board-view";
import { Button } from "@/components/ui/button";
import { api, type Project } from "@/lib/api/client";

export default function BoardPage({ params }: PageProps<"/tableros/[id]">) {
  const { id } = use(params);
  const { data } = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });
  const proj = data?.find((p) => p.id === id);

  return (
    <>
      <Link
        href="/tableros"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tableros de Jira
      </Link>
      <section className="banner flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/80">{proj?.account ?? " "}</p>
          <h1 className="text-2xl font-bold tracking-tight">{proj?.name ?? "Tablero"}</h1>
          <p className="mt-1 text-white/85">Sprint en curso · se actualiza solo cada minuto</p>
        </div>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href={`/proyectos/`} />}
          className="print:hidden"
        >
          <LineChart className="size-4" /> Ver cumplimiento
        </Button>
      </section>
      <BoardView project={id} />
    </>
  );
}
