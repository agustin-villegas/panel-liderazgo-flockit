"use client";

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
  onCancel: () => void;
  onConfirm: (typed: string) => void;
};

/** Confirmación fuerte: hay que escribir el nombre exacto. */
export function DeleteDialog({ name, detail, onCancel, onConfirm }: Props) {
  const [typed, setTyped] = useState("");
  return (
    <AlertDialog open={!!name} onOpenChange={(o) => !o && (setTyped(""), onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {detail} Escribí el nombre para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Nombre para confirmar"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={typed.trim() !== name}
            onClick={() => (onConfirm(typed), setTyped(""))}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
