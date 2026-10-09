import { Suspense } from "react";

import { BrandPanel } from "./brand-panel";
import { LoginForm } from "./login-form";

export const metadata = { title: "Ingresar · Panel de liderazgo" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <BrandPanel />
      <section className="login-sheet">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Ingresá al panel</h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Cumplimiento de sprints, satisfacción e informes en un solo lugar.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
