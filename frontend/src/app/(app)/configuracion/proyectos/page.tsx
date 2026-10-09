"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/config/delete-dialog";
import { ProjectDialog } from "@/components/config/project-dialog";
import { ExportButtons } from "@/components/panel/export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <section className="banner">
        <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
        <p className="mt-1 text-white/85">Cada proyecto se mide contra un board de Jira.</p>
      </section>

      <Card data-section="proyectos">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Proyectos activos</CardTitle>
          <div className="flex gap-2">
            <ExportButtons
              name="proyectos"
              section="proyectos"
              cols={cols}
              rows={projects.data ?? []}
            />
            <Button onClick={() => (setEdit(null), setOpen(true))} className="print:hidden">
              <Plus className="size-4" /> Nuevo proyecto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.isLoading ? (
            <Skeleton className="h-32" />
          ) : projects.data?.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay proyectos. Creá el primero con la conexión Demo para ver el panel funcionando.
            </p>
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
                          aria-label="Editar"
                          onClick={() => (setEdit(p), setOpen(true))}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Archivar"
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
        </CardContent>
      </Card>

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
