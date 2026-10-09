"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, post, type Account, type Board, type Conn, type Project } from "@/lib/api/client";

const NEW = "__nueva__";
const sel = "bg-background h-9 w-full rounded-md border px-2 text-sm disabled:opacity-50";

export function ProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [acc, setAcc] = useState("");
  const [accName, setAccName] = useState("");
  const [conn, setConn] = useState("");
  const [board, setBoard] = useState("");
  const [name, setName] = useState("");

  const accounts = useQuery({
    queryKey: ["cuentas"],
    queryFn: () => api<Account[]>("/cuentas"),
    enabled: open,
  });
  const conns = useQuery({
    queryKey: ["conexiones"],
    queryFn: () => api<Conn[]>("/conexiones"),
    enabled: open,
  });
  const boards = useQuery({
    queryKey: ["boards", conn],
    queryFn: () => api<Board[]>(`/conexiones/${conn}/boards`),
    enabled: !!conn,
  });

  const save = useMutation({
    mutationFn: async () => {
      let accountId = acc;
      if (acc === NEW) accountId = (await post<Account>("/cuentas", { name: accName })).id;
      const b = boards.data?.find((x) => String(x.id) === board);
      return post<Project>("/proyectos", {
        name,
        account_id: accountId,
        conn_id: conn,
        board_id: Number(board),
        board_name: b?.name ?? "",
        managers: [],
      });
    },
    onSuccess: () => {
      toast.success("Proyecto creado");
      for (const k of ["proyectos", "cartera", "cuentas", "conexiones"])
        qc.invalidateQueries({ queryKey: [k] });
      close();
    },
    onError: (e) => toast.error(e.message),
  });

  function close() {
    setAcc("");
    setAccName("");
    setConn("");
    setBoard("");
    setName("");
    onClose();
  }

  const ready =
    name.trim().length >= 2 && conn && board && acc && (acc !== NEW || accName.trim().length >= 2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Vinculá el proyecto a un board de Jira para medir su cumplimiento.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="p-acc">Cuenta (cliente)</FieldLabel>
            <select id="p-acc" className={sel} value={acc} onChange={(e) => setAcc(e.target.value)}>
              <option value="">Elegí una cuenta…</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value={NEW}>+ Nueva cuenta</option>
            </select>
            {acc === NEW && (
              <Input
                placeholder="Nombre de la cuenta"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
              />
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="p-conn">Conexión de Jira</FieldLabel>
            <select
              id="p-conn"
              className={sel}
              value={conn}
              onChange={(e) => (setConn(e.target.value), setBoard(""))}
            >
              <option value="">Elegí una conexión…</option>
              {conns.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="p-board">Board</FieldLabel>
            <select
              id="p-board"
              className={sel}
              value={board}
              disabled={!conn || boards.isLoading}
              onChange={(e) => {
                setBoard(e.target.value);
                const b = boards.data?.find((x) => String(x.id) === e.target.value);
                if (b && !name) setName(b.name.replace(/^\w+\s·\s/, ""));
              }}
            >
              <option value="">{boards.isLoading ? "Cargando boards…" : "Elegí un board…"}</option>
              {boards.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {boards.error && (
              <FieldDescription className="text-crit-fg">{boards.error.message}</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="p-name">Nombre del proyecto</FieldLabel>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={!ready || save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
