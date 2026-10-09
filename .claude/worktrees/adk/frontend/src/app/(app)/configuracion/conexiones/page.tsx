"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConnDialog } from "@/components/config/conn-dialog";
import { DeleteDialog } from "@/components/config/delete-dialog";
import { ExportButtons } from "@/components/panel/export-buttons";
import { Badge } from "@/components/ui/badge";
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
import { api, del, type Conn } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day } from "@/lib/format";

const cols: Col<Conn>[] = [
  { label: "Nombre", value: (c) => c.name },
  { label: "Tipo", value: (c) => c.kind },
  { label: "Site", value: (c) => c.site },
  { label: "Email", value: (c) => c.email },
  { label: "Campo SP", value: (c) => c.sp_field },
  { label: "Proyectos", value: (c) => c.projects },
  { label: "Estado", value: (c) => c.status },
];

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Conn | null>(null);
  const [drop, setDrop] = useState<Conn | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["conexiones"],
    queryFn: () => api<Conn[]>("/conexiones"),
  });

  const remove = useMutation({
    mutationFn: ({ c, typed }: { c: Conn; typed: string }) =>
      del(`/conexiones/${c.id}?confirm=${encodeURIComponent(typed)}`),
    onSuccess: () => {
      toast.success("Conexión eliminada");
      qc.invalidateQueries({ queryKey: ["conexiones"] });
      setDrop(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <section className="banner">
        <h1 className="text-2xl font-bold tracking-tight">Conexiones de Jira</h1>
        <p className="mt-1 text-white/85">
          Credenciales de cada sitio de Jira Cloud. Los tokens se guardan cifrados y nunca se
          muestran.
        </p>
      </section>

      <Card data-section="conexiones">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Conexiones</CardTitle>
          <div className="flex gap-2">
            <ExportButtons name="conexiones" section="conexiones" cols={cols} rows={data ?? []} />
            <Button onClick={() => (setEdit(null), setOpen(true))} className="print:hidden">
              <Plus className="size-4" /> Nueva conexión
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-crit-fg">{error.message}</p>}
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Campo SP</TableHead>
                  <TableHead className="text-right">Proyectos</TableHead>
                  <TableHead>Última prueba</TableHead>
                  <TableHead className="print:hidden" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.kind === "demo" && (
                        <Badge variant="secondary" className="ml-2">
                          Demo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.site ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.token_last4 ? `••••${c.token_last4}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{c.sp_field ?? "—"}</TableCell>
                    <TableCell className="text-right">{c.projects}</TableCell>
                    <TableCell className="text-muted-foreground">{day(c.checked_at)}</TableCell>
                    <TableCell className="text-right print:hidden">
                      {c.kind !== "demo" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => (setEdit(c), setOpen(true))}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar"
                            onClick={() => setDrop(c)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConnDialog open={open} edit={edit} onClose={() => setOpen(false)} />
      <DeleteDialog
        name={drop?.name ?? null}
        detail={`Los ${drop?.projects ?? 0} proyectos que la usan quedan sin conexión.`}
        onCancel={() => setDrop(null)}
        onConfirm={(typed) => drop && remove.mutate({ c: drop, typed })}
      />
    </>
  );
}
