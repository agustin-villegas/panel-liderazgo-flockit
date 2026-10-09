"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { BoardView } from "@/components/board/board-view";
import { PageHeader } from "@/components/panel/page-header";
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
      <PageHeader
        back={{ href: "/tableros", label: "Tableros de Jira" }}
        eyebrow={proj?.account ?? " "}
        title={proj?.name ?? "Tablero"}
        description="Sprint en curso · se actualiza solo cada minuto"
        actions={
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href={`/proyectos/${id}`} />}
          >
            <LineChart className="size-4" /> Ver cumplimiento
          </Button>
        }
      />
      <BoardView project={id} />
    </>
  );
}
