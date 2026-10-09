"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

type Props = {
  name: string | null;
  detail: string;
  /** Verbo de la acción: "Eliminar" (default), "Archivar", etc. */
  action?: string;
  onCancel: () => void;
  onConfirm: (typed: string) => void;
};

/** Confirmación fuerte: hay que escribir el nombre exacto. */
export function DeleteDialog({ name, detail, action = "Eliminar", onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState("");
  const done = () => setTyped("");
  return (
    <AlertDialog open={!!name} onOpenChange={(o) => !o && (done(), onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" aria-hidden />
          </div>
          <AlertDialogTitle className="text-lg font-semibold">
            {action} “{name}”
          </AlertDialogTitle>
          <AlertDialogDescription>{detail}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <label htmlFor="del-name" className="text-sm">
            Para confirmar, escribí{" "}
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all text-foreground">
              {name}
            </span>
          </label>
          <Input
            id="del-name"
            value={typed}
            placeholder={name ?? ""}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={typed.trim() !== name}
            onClick={() => (onConfirm(typed), done())}
          >
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
