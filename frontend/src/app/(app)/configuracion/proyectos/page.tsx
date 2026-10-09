"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, FolderPlus, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/config/delete-dialog";
import { ProjectDialog } from "@/components/config/project-dialog";
import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { PageHeader } from "@/components/panel/page-header";
import { TableCard } from "@/components/panel/table-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty } from "@/components/viz/empty";
import { api, del, type Conn, type Project } from "@/lib/api/client";
import type { Col } from "@/lib/export";

export default function ProjectsConfigPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | null>(null);
  const [drop, setDrop] = useState<Project | null>(null);
  const projects = useQuery({
    queryKey: ["proyectos"],
    queryFn: () => api<Project[]>("/proyectos"),
  });
  const conns = useQuery({ queryKey: ["conexiones"], queryFn: () => api<Conn[]>("/conexiones") });
  const connName = (id: string | null) =>
    conns.data?.find((c) => c.id === id)?.name ?? "Sin conexión";

  const cols: Col<Project>[] = [
    { label: "Proyecto", value: (p) => p.name },
    { label: "Cuenta", value: (p) => p.account },
    { label: "Conexión", value: (p) => connName(p.conn_id) },
    { label: "Board", value: (p) => p.board_name },
  ];

  const archive = useMutation({
    mutationFn: (p: Project) => del(`/proyectos/${p.id}`),
    onSuccess: () => {
      toast.success("Proyecto archivado");
      for (const k of ["proyectos", "cartera", "conexiones"])
        qc.invalidateQueries({ queryKey: [k] });
      setDrop(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Cada proyecto se mide contra un board de Jira."
        actions={
          <Button variant="secondary" onClick={() => (setEdit(null), setOpen(true))}>
            <Plus className="size-4" /> Nuevo proyecto
          </Button>
        }
      />

      <TableCard
        title="Proyectos activos"
        section="proyectos"
        actions={
          <ExportButtons
            name="proyectos"
            section="proyectos"
            cols={cols}
            rows={projects.data ?? []}
          />
        }
      >
        {projects.error ? (
          <ErrorState message={projects.error.message} onRetry={() => projects.refetch()} />
        ) : projects.isLoading ? (
          <Skeleton className="h-32" />
        ) : projects.data?.length === 0 ? (
          <Empty
            icon={FolderPlus}
            title="No hay proyectos"
            hint="Creá el primero con la conexión Demo para ver el panel funcionando."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Conexión</TableHead>
                <TableHead>Board</TableHead>
                <TableHead className="print:hidden" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.data?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/proyectos/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.account}</TableCell>
                  <TableCell className="text-muted-foreground">{connName(p.conn_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.board_name}</TableCell>
                  <TableCell className="text-right print:hidden">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 md:size-8"
                        aria-label="Editar"
                        title="Editar"
                        onClick={() => (setEdit(p), setOpen(true))}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 md:size-8"
                        aria-label="Archivar"
                        title="Archivar"
                        onClick={() => setDrop(p)}
                      >
                        <Archive className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      {open && (
        <ProjectDialog key={edit?.id ?? "new"} open edit={edit} onClose={() => setOpen(false)} />
      )}
      <DeleteDialog
        name={drop?.name ?? null}
        action="Archivar"
        detail="El proyecto deja de aparecer en el panel. Sus datos se conservan."
        onCancel={() => setDrop(null)}
        onConfirm={() => drop && archive.mutate(drop)}
      />
    </>
  );
}
