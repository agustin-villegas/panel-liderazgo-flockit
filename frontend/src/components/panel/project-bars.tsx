"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Card as CardData } from "@/lib/api/client";

const config: ChartConfig = { v: { label: "Cumplimiento", color: "var(--ok)" } };

const fill = (v: number | null) =>
  v === null ? "var(--idle)" : v >= 85 ? "var(--ok)" : v >= 70 ? "var(--warn)" : "var(--crit)";

/** Barras de cumplimiento de los últimos sprints cerrados de un proyecto. */
export function ProjectBars({ card, className = "h-64" }: { card: CardData; className?: string }) {
  const n = card.trend.length;
  const data = card.trend.map((t, i) => ({
    name: i === n - 1 ? "Último" : `−${n - 1 - i}`,
    v: t === null ? null : Math.round(t * 100),
  }));
  return (
    <ChartContainer
      config={config}
      className={`aspect-auto w-full ${className}`}
      role="img"
      aria-label={`Cumplimiento de los últimos sprints de ${card.name}`}
    >
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          unit="%"
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ReferenceLine
          y={85}
          stroke="var(--ok)"
          strokeDasharray="4 4"
          label={{
            value: "Meta 85%",
            position: "insideTopRight",
            fill: "var(--ok-fg)",
            fontSize: 11,
          }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((d, i) => (
            <Cell key={i} fill={fill(d.v)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
