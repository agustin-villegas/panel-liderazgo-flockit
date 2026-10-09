import { BookOpen, Braces, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/panel/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL;

type Doc = { title: string; text: string; href?: string; icon: LucideIcon; cta: string };

const DOCS: Doc[] = [
  {
    title: "Guía y documentación",
    text: "Guía de uso por pantalla y rol, preguntas frecuentes, arquitectura y motor de cumplimiento (Fumadocs).",
    href: DOCS_URL,
    icon: BookOpen,
    cta: "Abrir documentación",
  },
  {
    title: "API (Swagger)",
    text: "Referencia interactiva de la API del panel. Solo admins con sesión iniciada.",
    href: "/api/docs",
    icon: Braces,
    cta: "Abrir Swagger",
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader title="Documentación" description="Guía de uso y referencia de la API." />
      <div className="grid gap-4 md:grid-cols-2">
        {DOCS.map(({ title, text, href, icon: Icon, cta }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="grid gap-1">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {href ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={href} target="_blank" rel="noopener noreferrer" />}
                >
                  {cta} <ExternalLink aria-hidden />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no está publicada. Configurá <code>NEXT_PUBLIC_DOCS_URL</code> con la URL
                  del sitio de docs.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
