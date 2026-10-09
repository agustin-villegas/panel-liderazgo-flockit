"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, UserCheck, Users, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/config/delete-dialog";
import { ROLES, UserDialog } from "@/components/config/user-dialog";
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
import { api, post, type PanelUser } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { ago } from "@/lib/format";

const role = (u: PanelUser) => ROLES[u.role as keyof typeof ROLES] ?? u.role;
const last = (u: PanelUser) => (u.last_login_at ? ago(u.last_login_at) : "Nunca");

const cols: Col<PanelUser>[] = [
  { label: "Nombre", value: (u) => u.name },
  { label: "Email", value: (u) => u.email },
  { label: "Rol", value: role },
  { label: "Estado", value: (u) => (u.active ? "Activo" : "Deshabilitado") },
  { label: "Último acceso", value: last },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PanelUser | null>(null);
  const [drop, setDrop] = useState<PanelUser | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api<PanelUser[]>("/usuarios"),
  });

  const toggle = useMutation({
    mutationFn: ({ u, on }: { u: PanelUser; on: boolean }) =>
      post<PanelUser>(`/usuarios/${u.id}/${on ? "habilitar" : "deshabilitar"}`),
    onSuccess: (_, { on }) => {
      toast.success(on ? "Usuario habilitado" : "Usuario deshabilitado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      setDrop(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién puede ingresar al panel y con qué rol. Los usuarios no se borran: se deshabilitan."
        actions={
          <Button variant="secondary" onClick={() => (setEdit(null), setOpen(true))}>
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <TableCard
        title="Usuarios"
        section="usuarios"
        actions={<ExportButtons name="usuarios" section="usuarios" cols={cols} rows={data ?? []} />}
      >
        {error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-32" />
        ) : data?.length === 0 ? (
          <Empty
            icon={Users}
            title="Todavía no hay usuarios"
            hint="Creá el primero para darle acceso al panel."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="print:hidden" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{role(u)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={u.active ? "bg-ok-bg text-ok-fg" : "bg-idle-bg text-idle-fg"}
                    >
                      {u.active ? "Activo" : "Deshabilitado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{last(u)}</TableCell>
                  <TableCell className="text-right print:hidden">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 md:size-8"
                        aria-label={`Editar ${u.name}`}
                        title="Editar"
                        onClick={() => (setEdit(u), setOpen(true))}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {u.active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 md:size-8"
                          aria-label={`Deshabilitar ${u.name}`}
                          title="Deshabilitar"
                          onClick={() => setDrop(u)}
                        >
                          <UserX className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 md:size-8"
                          aria-label={`Habilitar ${u.name}`}
                          title="Habilitar"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ u, on: true })}
                        >
                          <UserCheck className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>

      <UserDialog open={open} edit={edit} onClose={() => setOpen(false)} />
      <DeleteDialog
        name={drop?.name ?? null}
        action="Deshabilitar"
        detail="No va a poder ingresar y se cierran sus sesiones y tokens MCP. Podés volver a habilitarlo."
        onCancel={() => setDrop(null)}
        onConfirm={() => drop && toggle.mutate({ u: drop, on: false })}
      />
    </>
  );
}
