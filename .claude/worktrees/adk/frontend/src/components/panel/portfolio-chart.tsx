"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Card as CardData } from "@/lib/api/client";

const N = 6;
const DASH = [undefined, "6 3", "2 3"];

const lbl = (i: number) => (i === N - 1 ? "Último" : `−${N - 1 - i}`);

/** Cumplimiento de los últimos 6 sprints cerrados, una línea por proyecto. */
export function PortfolioChart({ cards }: { cards: CardData[] }) {
  const list = cards.filter((c) => !c.error && c.trend.length > 0);
  const config: ChartConfig = {};
  list.forEach((c, i) => {
    config[`p${i}`] = { label: c.name, color: `var(--chart-${(i % 6) + 1})` };
  });

  // alinea por la derecha: el último punto es el último sprint cerrado
  const data = Array.from({ length: N }, (_, i) => {
    const row: Record<string, string | number | null> = { name: lbl(i) };
    list.forEach((c, k) => {
      const v = c.trend[c.trend.length - N + i];
      row[`p${k}`] = v === undefined || v === null ? null : Math.round(v * 100);
    });
    return row;
  });

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-64 w-full"
      role="img"
      aria-label="Cumplimiento de los últimos sprints por proyecto"
    >
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
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
        <ChartLegend content={<ChartLegendContent />} />
        {list.map((_, i) => (
          <Line
            key={i}
            dataKey={`p${i}`}
            stroke={`var(--color-p${i})`}
            strokeWidth={2.5}
            strokeDasharray={DASH[Math.floor(i / 6) % 3]}
            dot={{ r: 3.5 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
