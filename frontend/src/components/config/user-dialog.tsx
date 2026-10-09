"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { patch, post, type PanelUser } from "@/lib/api/client";

export const ROLES = { admin: "Admin", team_manager: "Team Manager", cliente: "Cliente" } as const;
const MIN = 12;

const base = z.object({
  first_name: z.string().trim().min(1, "Ingresá el nombre").max(60, "Máximo 60 caracteres"),
  last_name: z.string().trim().min(1, "Ingresá el apellido").max(60, "Máximo 60 caracteres"),
  email: z.string().trim().min(1, "Ingresá el email").pipe(z.email("Email inválido")),
  role: z.enum(["admin", "team_manager", "cliente"]),
  password: z.string().max(200, "Máximo 200 caracteres"),
  password_confirm: z.string(),
});
type Form = z.infer<typeof base>;

const schema = (edit: boolean) =>
  base.superRefine((d, ctx) => {
    if (edit && d.password === "" && d.password_confirm === "") return;
    if (d.password.length < MIN)
      ctx.addIssue({ code: "custom", path: ["password"], message: `Mínimo ${MIN} caracteres` });
    if (d.password !== d.password_confirm)
      ctx.addIssue({
        code: "custom",
        path: ["password_confirm"],
        message: "Las contraseñas no coinciden",
      });
  });

type PwdProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  reg: UseFormRegisterReturn;
};

function PwdField({ id, label, error, hint, reg }: PwdProps) {
  const [show, setShow] = useState(false);
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          className="pr-10"
          {...reg}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 size-9"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

type Props = { open: boolean; onClose: () => void; edit?: PanelUser | null };

export function UserDialog({ open, onClose, edit }: Props) {
  const qc = useQueryClient();
  const form = useForm<Form>({
    resolver: zodResolver(schema(!!edit)),
    mode: "onTouched",
    values: {
      first_name: edit?.first_name ?? "",
      last_name: edit?.last_name ?? "",
      email: edit?.email ?? "",
      role: (edit?.role as Form["role"]) ?? "team_manager",
      password: "",
      password_confirm: "",
    },
  });
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: (d: Form) =>
      edit ? patch<PanelUser>(`/usuarios/${edit.id}`, d) : post<PanelUser>("/usuarios", d),
    onSuccess: () => {
      toast.success(edit ? "Usuario actualizado" : "Usuario creado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      close();
    },
    onError: (e) => toast.error(e.message),
  });

  function close() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{edit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {edit
              ? "Dejá la contraseña vacía para no cambiarla. Si la cambiás, se cierran sus sesiones."
              : "Va a ingresar con su email y la contraseña que definas."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((d) => save.mutate(d))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.first_name}>
              <FieldLabel htmlFor="u-first">Nombre</FieldLabel>
              <Input id="u-first" autoComplete="off" {...form.register("first_name")} />
              <FieldError>{errors.first_name?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.last_name}>
              <FieldLabel htmlFor="u-last">Apellido</FieldLabel>
              <Input id="u-last" autoComplete="off" {...form.register("last_name")} />
              <FieldError>{errors.last_name?.message}</FieldError>
            </Field>
          </div>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="u-email">Email</FieldLabel>
            <Input id="u-email" type="email" autoComplete="off" {...form.register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="u-role">Rol</FieldLabel>
            <NativeSelect id="u-role" {...form.register("role")}>
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <PwdField
            id="u-pwd"
            label={edit ? "Contraseña nueva (opcional)" : "Contraseña"}
            hint={`Mínimo ${MIN} caracteres.`}
            error={errors.password?.message}
            reg={form.register("password")}
          />
          <PwdField
            id="u-pwd2"
            label="Confirmar contraseña"
            error={errors.password_confirm?.message}
            reg={form.register("password_confirm")}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {edit ? "Guardar" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
