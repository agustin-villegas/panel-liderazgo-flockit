"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plug, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConnDialog } from "@/components/config/conn-dialog";
import { DeleteDialog } from "@/components/config/delete-dialog";
import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { PageHeader } from "@/components/panel/page-header";
import { TableCard } from "@/components/panel/table-card";
import { Badge } from "@/components/ui/badge";
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
  const { data, isLoading, error, refetch } = useQuery({
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
      <PageHeader
        title="Conexiones de Jira"
        description="Credenciales de cada sitio de Jira Cloud. Los tokens se guardan cifrados y nunca se muestran."
        actions={
          <Button variant="secondary" onClick={() => (setEdit(null), setOpen(true))}>
            <Plus className="size-4" /> Nueva conexión
          </Button>
        }
      />

      <TableCard
        title="Conexiones"
        section="conexiones"
        actions={
          <ExportButtons name="conexiones" section="conexiones" cols={cols} rows={data ?? []} />
        }
      >
        {error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-32" />
        ) : data?.length === 0 ? (
          <Empty
            icon={Plug}
            title="Todavía no hay conexiones"
            hint="Creá una conexión a Jira Cloud para traer los boards."
          />
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
                  <TableCell className="text-right tabular-nums">{c.projects}</TableCell>
                  <TableCell className="text-muted-foreground">{day(c.checked_at)}</TableCell>
                  <TableCell className="text-right print:hidden">
                    {c.kind !== "demo" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 md:size-8"
                          aria-label="Editar"
                          title="Editar"
                          onClick={() => (setEdit(c), setOpen(true))}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 md:size-8"
                          aria-label="Eliminar"
                          title="Eliminar"
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
      </TableCard>

      <ConnDialog open={open} edit={edit} onClose={() => setOpen(false)} />
      <DeleteDialog
        name={drop?.name ?? null}
        action="Eliminar"
        detail={`Los ${drop?.projects ?? 0} proyectos que la usan quedan sin conexión.`}
        onCancel={() => setDrop(null)}
        onConfirm={(typed) => drop && remove.mutate({ c: drop, typed })}
      />
    </>
  );
}
