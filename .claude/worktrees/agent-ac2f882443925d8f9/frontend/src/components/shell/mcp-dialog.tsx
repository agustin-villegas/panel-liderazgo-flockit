"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError, api, del, post, type McpToken, type McpTokenNew } from "@/lib/api/client";
import { ago } from "@/lib/format";

const KEY = ["tokens-mcp"];

/** Tokens personales para usar el panel por MCP desde Claude Code o Cursor. */
export function McpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: KEY,
    queryFn: () => api<McpToken[]>("/perfil/tokens-mcp"),
    enabled: open,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Algo salió mal");

  const create = useMutation({
    mutationFn: () => post<McpTokenNew>("/perfil/tokens-mcp", { name: name.trim() }),
    onSuccess: (t) => {
      setFresh(t.token);
      setName("");
      void refresh();
    },
    onError: fail,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => del(`/perfil/tokens-mcp/${id}`),
    onSuccess: () => {
      toast.success("Token revocado");
      void refresh();
    },
    onError: fail,
  });

  function close() {
    setFresh(null);
    onClose();
  }

  async function copy(v: string) {
    await navigator.clipboard.writeText(v);
    toast.success("Copiado");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tokens MCP</DialogTitle>
          <DialogDescription>
            Para consultar el panel desde Claude Code o Cursor. El token respeta tus permisos y se
            puede revocar.
          </DialogDescription>
        </DialogHeader>

        {fresh && (
          <div className="grid gap-2 rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
            <p className="font-medium">Copialo ahora: no se vuelve a mostrar.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1">{fresh}</code>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => copy(fresh)}
                aria-label="Copiar"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              Usalo como header <code>Authorization: Bearer …</code> contra <code>/mcp</code>.
            </p>
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nombre (ej: Claude Code notebook)"
            aria-label="Nombre del token"
          />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Crear
          </Button>
        </form>

        <ul className="grid gap-1 text-sm">
          {data.length === 0 && <li className="text-muted-foreground">Sin tokens todavía.</li>}
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <div className="grid flex-1">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  ••••{t.last4} · {t.last_used_at ? `usado ${ago(t.last_used_at)}` : "sin usar"}
                </span>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => revoke.mutate(t.id)}
                disabled={revoke.isPending}
                aria-label={`Revocar ${t.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
