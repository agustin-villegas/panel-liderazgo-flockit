import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { message: string; onRetry?: () => void; className?: string };

/** Estado de error: ícono + mensaje + Reintentar. */
export function ErrorState({ message, onRetry, className }: Props) {
  return (
    <div
      role="alert"
      className={cn("grid justify-items-center gap-2 px-4 py-10 text-center", className)}
    >
      <span className="grid size-12 place-content-center rounded-2xl bg-crit-bg text-crit-fg">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <p className="max-w-md text-sm text-crit-fg">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-4" /> Reintentar
        </Button>
      )}
    </div>
  );
}
