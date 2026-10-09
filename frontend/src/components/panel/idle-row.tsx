import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Card as CardData } from "@/lib/api/client";
import { pct } from "@/lib/format";

import { LightBadge } from "./light-badge";

/** Fila compacta de un proyecto sin sprint en curso. */
export function IdleRow({ card }: { card: CardData }) {
  return (
    <Link
      href={`/proyectos/${card.id}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Ver cumplimiento de ${card.name}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{card.name}</span>
        {card.error ? (
          <span className="flex items-center gap-1 truncate text-xs text-crit-fg">
            <AlertTriangle className="size-3 shrink-0" aria-hidden />
            {card.error}
          </span>
        ) : (
          <span className="block truncate text-xs text-muted-foreground tabular-nums">
            {card.last ? `${card.last.name}: ${pct(card.last.pct)}` : "Sin sprints cerrados"}
          </span>
        )}
      </span>
      <LightBadge light={card.light} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
