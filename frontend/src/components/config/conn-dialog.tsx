"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { patch, post, type Conn, type TestOut } from "@/lib/api/client";

const schema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres"),
  site: z
    .url("Ingresá una URL")
    .regex(/^https:\/\/[^/]+\.atlassian\.net\/?$/, "Formato: https://<sitio>.atlassian.net"),
  email: z.email("Email inválido"),
  token: z.string(),
});
type Form = z.infer<typeof schema>;

type Props = { open: boolean; onClose: () => void; edit?: Conn | null };

export function ConnDialog({ open, onClose, edit }: Props) {
  const qc = useQueryClient();
  const [test, setTest] = useState<TestOut | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: { name: edit?.name ?? "", site: edit?.site ?? "", email: edit?.email ?? "", token: "" },
  });
  const { errors } = form.formState;

  const probe = useMutation({
    mutationFn: (d: Form) =>
      post<TestOut>("/conexiones/probar", {
        site: d.site,
        email: d.email,
        token: d.token || null,
        conn_id: edit?.id,
      }),
    onSuccess: setTest,
  });

  const save = useMutation({
    mutationFn: (d: Form) => {
      const body = { ...d, token: d.token || null, sp_field: test?.sp_field ?? null };
      return edit ? patch<Conn>(`/conexiones/${edit.id}`, body) : post<Conn>("/conexiones", body);
    },
    onSuccess: () => {
      toast.success(edit ? "Conexión actualizada" : "Conexión creada");
      qc.invalidateQueries({ queryKey: ["conexiones"] });
      close();
    },
    onError: (e) => toast.error(e.message),
  });

  function close() {
    setTest(null);
    form.reset();
    onClose();
  }

  const needToken = !edit;
  const onTest = form.handleSubmit((d) => {
    if (needToken && !d.token) return form.setError("token", { message: "Ingresá el API token" });
    probe.mutate(d);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{edit ? "Editar conexión" : "Nueva conexión de Jira"}</DialogTitle>
          <DialogDescription>Hay que probar la conexión antes de guardarla.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="c-name">Nombre</FieldLabel>
            <Input id="c-name" placeholder="Jira Banco Austral" {...form.register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>
          <Field data-invalid={!!errors.site}>
            <FieldLabel htmlFor="c-site">Site</FieldLabel>
            <Input
              id="c-site"
              placeholder="https://empresa.atlassian.net"
              {...form.register("site", { onChange: () => setTest(null) })}
            />
            <FieldError>{errors.site?.message}</FieldError>
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="c-email">Email</FieldLabel>
            <Input
              id="c-email"
              type="email"
              {...form.register("email", { onChange: () => setTest(null) })}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          <Field data-invalid={!!errors.token}>
            <FieldLabel htmlFor="c-token">API token</FieldLabel>
            <Input
              id="c-token"
              type="password"
              autoComplete="off"
              placeholder={edit ? `••••••••${edit.token_last4 ?? ""} (vacío = conservar)` : ""}
              {...form.register("token", { onChange: () => setTest(null) })}
            />
            <FieldDescription>
              Se genera en id.atlassian.com → Seguridad → API tokens. Se guarda cifrado.
            </FieldDescription>
            <FieldError>{errors.token?.message}</FieldError>
          </Field>

          {test && (
            <p
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${test.ok ? "bg-ok-bg text-ok-fg" : "bg-crit-bg text-crit-fg"}`}
              role="status"
            >
              {test.ok ? (
                <CheckCircle2 className="mt-0.5 size-4" />
              ) : (
                <XCircle className="mt-0.5 size-4" />
              )}
              {test.ok
                ? `Conectado como ${test.user}. Campo de story points: ${test.sp_field ?? "no detectado"}.`
                : test.error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onTest} disabled={probe.isPending}>
            {probe.isPending && <Loader2 className="size-4 animate-spin" />}
            Probar conexión
          </Button>
          <Button
            onClick={form.handleSubmit((d) => save.mutate(d))}
            disabled={!test?.ok || save.isPending}
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {edit ? "Guardar" : "Crear conexión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
