"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, post } from "@/lib/api/client";

const schema = z
  .object({
    current: z.string().min(1, "Ingresá tu contraseña actual"),
    next: z.string().min(12, "Mínimo 12 caracteres"),
    repeat: z.string(),
  })
  .refine((d) => d.next === d.repeat, { path: ["repeat"], message: "No coinciden" })
  .refine((d) => d.next !== d.current, {
    path: ["next"],
    message: "Tiene que ser distinta de la actual",
  });
type Form = z.infer<typeof schema>;

const fields: { name: keyof Form; label: string; auto: string }[] = [
  { name: "current", label: "Contraseña actual", auto: "current-password" },
  { name: "next", label: "Nueva contraseña", auto: "new-password" },
  { name: "repeat", label: "Repetí la nueva", auto: "new-password" },
];

export function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useForm<Form>({ resolver: zodResolver(schema), mode: "onTouched" });
  const { errors, isSubmitting } = form.formState;

  function close() {
    form.reset();
    onClose();
  }

  async function onSubmit(d: Form) {
    try {
      await post("/auth/password", { current: d.current, new: d.next });
      toast.success("Contraseña actualizada. Se cerraron tus otras sesiones.");
      close();
    } catch (e) {
      form.setError("current", {
        message: e instanceof ApiError ? e.message : "No se pudo cambiar",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Mínimo 12 caracteres. Tus otras sesiones se cierran.
          </DialogDescription>
        </DialogHeader>
        <form
          id="pwd-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          {fields.map((f) => (
            <Field key={f.name} data-invalid={!!errors[f.name]}>
              <FieldLabel htmlFor={`pwd-${f.name}`}>{f.label}</FieldLabel>
              <Input
                id={`pwd-${f.name}`}
                type="password"
                autoComplete={f.auto}
                aria-invalid={!!errors[f.name]}
                {...form.register(f.name)}
              />
              <FieldError>{errors[f.name]?.message}</FieldError>
            </Field>
          ))}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="pwd-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
