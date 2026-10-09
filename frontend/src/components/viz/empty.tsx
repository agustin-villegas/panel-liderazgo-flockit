import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

/** Estado vacío: ícono + una línea + CTA opcional. */
export function Empty({ icon: Icon, title, hint, children, className }: Props) {
  return (
    <div className={cn("grid justify-items-center gap-2 px-4 py-10 text-center", className)}>
      <span className="grid size-12 place-content-center rounded-2xl bg-secondary text-secondary-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
