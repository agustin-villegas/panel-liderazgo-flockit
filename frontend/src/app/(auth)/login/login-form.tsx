"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, post, type Me } from "@/lib/api/client";

const schema = z.object({
  email: z.email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
type Form = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Form>({ resolver: zodResolver(schema), mode: "onTouched" });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(data: Form) {
    setError(null);
    try {
      await post<Me>("/auth/login", data);
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos conectar con el servidor");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="nombre@flockit.com.ar"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </Field>

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="pr-10"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <FieldError>{errors.password?.message}</FieldError>
      </Field>

      <Button type="submit" size="lg" className="bg-brand text-white" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Ingresar
      </Button>
    </form>
  );
}
