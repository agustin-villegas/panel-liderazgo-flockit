import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BrandBar } from "@/components/viz/brand-bar";
import type { Card as CardData } from "@/lib/api/client";
import { month, pct, pts } from "@/lib/format";

import { LightBadge } from "./light-badge";
import { TrendBars } from "./trend-bars";

export function ProjectCard({ card }: { card: CardData }) {
  const { last, active } = card;
  return (
    <Link
      href={`/proyectos/${card.id}`}
      className="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{card.account}</p>
            <h3 className="truncate font-semibold">{card.name}</h3>
          </div>
          <LightBadge light={card.light} />
        </CardHeader>

        <CardContent className="grid gap-4">
          {card.error ? (
            <p className="flex items-start gap-2 text-sm text-crit-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {card.error}
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl leading-none font-bold">{pct(last?.pct)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {last
                      ? `${last.name} · ${pts(last.burned)}/${pts(last.planned)} pts`
                      : "Sin sprints cerrados"}
                  </p>
                </div>
                <div className="w-28">
                  <TrendBars values={card.trend} />
                </div>
              </div>

              {active && (
                <div className="grid gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">
                      {active.name} · día {active.day} de {active.days}
                    </span>
                    <span className="text-muted-foreground">
                      {pts(active.burned)}/{pts(active.planned)} pts
                    </span>
                  </div>
                  <BrandBar value={active.pct ?? 0} label="Avance del sprint activo" size="sm" />
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>
                  {card.month
                    ? `${month(card.month.month)}: ${pct(card.month.pct)}`
                    : "Sin datos del mes"}
                </span>
                <span className="flex items-center font-medium text-primary">
                  Ver detalle <ChevronRight className="size-3.5" />
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
