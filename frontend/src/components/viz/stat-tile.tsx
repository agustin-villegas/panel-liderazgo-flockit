"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  /** clases del chip del ícono (bg + texto) */
  chip?: string;
  loading?: boolean;
  hint?: string;
  compact?: boolean;
};

/** KPI con ícono y número que sube al cargar. */
export function StatTile({ label, value, icon: Icon, chip, loading, hint, compact }: Props) {
  const n = useCountUp(value);
  return (
    <Card className={cn("transition-shadow hover:shadow-md", compact ? "py-2.5" : "py-4")}>
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            "grid shrink-0 place-content-center bg-secondary text-secondary-foreground",
            compact ? "size-8 rounded-lg" : "size-10 rounded-xl",
            chip,
          )}
          aria-hidden
        >
          <Icon className={compact ? "size-4" : "size-5"} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className={cn("mt-1.5 w-10", compact ? "h-6" : "h-7")} />
          ) : (
            <p
              className={cn(
                "leading-none font-bold tabular-nums",
                compact ? "text-2xl" : "text-3xl",
              )}
            >
              {n}
            </p>
          )}
          {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
