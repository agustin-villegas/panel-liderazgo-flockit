"use client";

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SprintRow } from "@/lib/api/client";

const config = {
  planned: { label: "Planificados", color: "var(--chart-5)" },
  burned: { label: "Quemados", color: "var(--chart-1)" },
  pct: { label: "Cumplimiento %", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ComplianceChart({ sprints }: { sprints: SprintRow[] }) {
  const data = sprints.map((s) => ({
    name: s.name.replace(/^.*?Sprint\s*/i, "S"),
    planned: s.planned,
    burned: s.burned,
    pct: s.pct === null ? null : Math.round(s.pct * 100),
  }));
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <ComposedChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis yAxisId="pts" tickLine={false} axisLine={false} width={32} />
        <YAxis
          yAxisId="pct"
          orientation="right"
          domain={[0, 100]}
          unit="%"
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="pts" dataKey="planned" fill="var(--color-planned)" radius={4} />
        <Bar yAxisId="pts" dataKey="burned" fill="var(--color-burned)" radius={4} />
        <Line
          yAxisId="pct"
          dataKey="pct"
          stroke="var(--color-pct)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
