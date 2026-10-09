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
};

/** KPI con ícono y número que sube al cargar. */
export function StatTile({ label, value, icon: Icon, chip, loading, hint }: Props) {
  const n = useCountUp(value);
  return (
    <Card className="py-4 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-content-center rounded-xl bg-secondary text-secondary-foreground",
            chip,
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-7 w-10" />
          ) : (
            <p className="text-3xl leading-none font-bold tabular-nums">{n}</p>
          )}
          {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
