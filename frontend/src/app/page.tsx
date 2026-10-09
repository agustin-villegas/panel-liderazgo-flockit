import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="bg-home flex flex-1 flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center justify-between">
        <span className="text-brand text-xl font-bold">Panel de liderazgo</span>
        <ThemeToggle />
      </header>

      <section className="banner">
        <h1 className="text-2xl font-bold tracking-tight">Fase 0 · Setup</h1>
        <p className="mt-1 text-white/85">Esqueleto listo. El panel llega en la fase 3.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  );
}
