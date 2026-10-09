"use client";

import { useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Ticket } from "@/lib/api/client";

import { LANES, LANE_ORDER } from "./lanes";

type Cut = "lane" | "priority" | "type";
const CUTS: { value: Cut; label: string }[] = [
  { value: "lane", label: "Estado" },
  { value: "priority", label: "Prioridad" },
  { value: "type", label: "Tipo" },
];
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/** Un solo gráfico con selector de corte (idea del portal de Flock). */
export function BoardDonut({ cards }: { cards: Ticket[] }) {
  const [cut, setCut] = useState<Cut>("lane");

  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c[cut], (counts.get(c[cut]) ?? 0) + 1);
  const keys = cut === "lane" ? LANE_ORDER.filter((k) => counts.has(k)) : [...counts.keys()].sort();
  const data = keys.map((k, i) => ({
    name: cut === "lane" ? LANES[k as keyof typeof LANES].label : k,
    value: counts.get(k) ?? 0,
    fill: cut === "lane" ? LANES[k as keyof typeof LANES].color : PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="grid gap-3">
      <div className="flex gap-1" role="tablist" aria-label="Corte del gráfico">
        {CUTS.map((c) => (
          <button
            key={c.value}
            role="tab"
            aria-selected={cut === c.value}
            onClick={() => setCut(c.value)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground aria-selected:bg-secondary aria-selected:text-secondary-foreground"
          >
            {c.label}
          </button>
        ))}
      </div>
      <ChartContainer config={{}} className="mx-auto aspect-square h-48">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} strokeWidth={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid gap-1 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: d.fill }} aria-hidden />
              {d.name}
            </span>
            <span className="font-semibold">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
