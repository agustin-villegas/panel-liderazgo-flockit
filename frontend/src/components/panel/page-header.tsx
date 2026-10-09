import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
};

/** Encabezado de pantalla: banner de marca con título, bajada y acciones. */
export function PageHeader({ title, description, eyebrow, back, actions }: Props) {
  return (
    <>
      {back && (
        <Link
          href={back.href}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <section className="banner flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm text-white/80">{eyebrow}</p>}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <div className="mt-1 text-white/85">{description}</div>}
        </div>
        {actions && (
          <div className="relative z-10 flex flex-wrap gap-2 print:hidden">{actions}</div>
        )}
      </section>
    </>
  );
}
