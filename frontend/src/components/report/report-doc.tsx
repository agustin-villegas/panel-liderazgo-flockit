"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { ExportButtons } from "@/components/panel/export-buttons";
import { LightBadge } from "@/components/panel/light-badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ReportData, Story } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, month, pct, pts } from "@/lib/format";

const AUD: Record<string, string> = { equipo: "Equipo", cliente: "Cliente", gerencia: "Gerencia" };
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const trendCfg = {
  planned: { label: "Planificados", color: "var(--chart-5)" },
  burned: { label: "Quemados", color: "var(--chart-1)" },
  pct: { label: "Cumplimiento %", color: "var(--chart-2)" },
} satisfies ChartConfig;
const peopleCfg = {
  planned: { label: "Planificados", color: "var(--chart-5)" },
  burned: { label: "Quemados", color: "var(--chart-1)" },
} satisfies ChartConfig;

type Slice = NonNullable<ReportData["types"]>[number];
type Person = NonNullable<ReportData["work"]>[number];
type Item = Person["closed"][number];
type Pending = ReportData["pending"][number];
type Row = ReportData["sprint"]["people"][number];

const pendingCols: Col<Pending>[] = [
  { label: "Issue", value: (p) => p.key },
  { label: "Título", value: (p) => p.title },
  { label: "Estado", value: (p) => p.status },
  { label: "Responsable", value: (p) => p.assignee ?? "Sin asignar" },
  { label: "SP", value: (p) => p.sp },
];
const peopleCols: Col<Row>[] = [
  { label: "Persona", value: (p) => p.name },
  { label: "Planificados", value: (p) => p.planned },
  { label: "Quemados", value: (p) => p.burned },
  { label: "Cumplimiento", value: (p) => pct(p.pct) },
];

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Props = {
  data: ReportData;
  audience: string;
  date?: string;
  author?: string;
  story: React.ReactNode;
};

/** El documento del informe (pantalla y PDF). Los números vienen del motor. */
export function ReportDoc({ data, audience, date, author, story }: Props) {
  const s = data.sprint;
  const types = data.types ?? [];
  const work = data.work ?? [];
  const trend = data.trend.map((t) => ({
    name: t.name.replace(/^.*?Sprint\s*/i, "S"),
    planned: t.planned,
    burned: t.burned,
    pct: t.pct === null ? null : Math.round(t.pct * 100),
  }));
  const slices = types.map((t, i) => ({
    ...t,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <article
      data-section="informe"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
    >
      <header className="bg-brand flex flex-wrap items-end justify-between gap-4 px-4 py-6 text-white sm:px-8">
        <div>
          <p className="text-sm text-white/80">
            {data.account} · Informe de sprint para {AUD[audience] ?? audience}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">{data.project}</h2>
          <p className="text-white/85">
            {s.name} · {day(s.start)} – {day(s.end)}
            {s.provisional && " · en curso (provisorio)"}
          </p>
        </div>
        <div className="text-right text-xs text-white/80">
          {date && <p>Generado el {day(date)}</p>}
          {author && <p>por {author}</p>}
          <p className="mt-1 font-semibold text-white">Flock · Panel de liderazgo</p>
        </div>
      </header>

      <div className="grid gap-8 p-4 sm:p-8">
        <section className="rounded-xl border bg-secondary/50 p-4 print:break-inside-avoid">
          <h3 className="font-semibold">Objetivo del sprint</h3>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
            {s.goal || "Jira no tiene un objetivo cargado para este sprint."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          <Kpi label="Cumplimiento" value={pct(s.pct)} extra={<LightBadge light={s.light} />} />
          <Kpi label="Planificados" value={`${pts(s.planned)} SP`} />
          <Kpi label="Quemados" value={`${pts(s.burned)} SP`} />
          <Kpi
            label={data.month ? `Mes ${month(data.month.month)}` : "Mes"}
            value={pct(data.month?.pct)}
          />
        </section>

        <section className="grid gap-2">
          <h3 className="font-semibold">Lectura del sprint</h3>
          {story}
        </section>

        <section className="grid gap-6 lg:grid-cols-2 print:grid-cols-2">
          <div className="grid gap-2 print:break-inside-avoid">
            <h3 className="font-semibold">Tendencia de cumplimiento</h3>
            <ChartContainer config={trendCfg} className="aspect-auto h-64 w-full">
              <ComposedChart data={trend} margin={{ left: 0, right: 8 }}>
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
          </div>
          <TypeChart slices={slices} />
        </section>

        <People work={work} fallback={s.people} />

        <section className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Pendientes del sprint ({data.pending.length})</h3>
            <ExportButtons
              name={`pendientes-${s.name}`}
              section="informe"
              cols={pendingCols}
              rows={data.pending}
            />
          </div>
          {data.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todo lo planificado quedó terminado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-right">SP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pending.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="font-medium">{p.key}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>{p.assignee ?? "Sin asignar"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.sp === null ? "—" : pts(p.sp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Cumplimiento = SP quemados ÷ SP planificados del sprint, con la metodología de auditoría
          (una issue quema solo en el sprint en que se finalizó). Datos calculados desde Jira; la
          lectura del sprint fue redactada con IA sobre estos números.
        </p>
      </div>
    </article>
  );
}

function TypeChart({ slices }: { slices: (Slice & { fill: string })[] }) {
  return (
    <div className="grid content-start gap-2 print:break-inside-avoid">
      <h3 className="font-semibold">Por tipo de issue</h3>
      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este informe no trae el corte por tipo.</p>
      ) : (
        <>
          <ChartContainer config={{}} className="mx-auto aspect-square h-52 max-w-52">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
              <Pie data={slices} dataKey="count" nameKey="name" innerRadius={48} strokeWidth={2}>
                {slices.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="grid gap-1 text-sm">
            {slices.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: d.fill }}
                    aria-hidden
                  />
                  {d.name}
                </span>
                <span className="text-muted-foreground">
                  {d.count} · {pts(d.planned)} plan. · {pts(d.burned)} quem.
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function People({ work, fallback }: { work: Person[]; fallback: ReportData["sprint"]["people"] }) {
  const mobile = useIsMobile();
  const yw = mobile ? 96 : 176;
  const rows = work.length
    ? work
    : fallback.map((p) => ({ ...p, closed: [] as Item[], open: [] as Item[] }));
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Por persona</h3>
        <ExportButtons name="personas" section="informe" cols={peopleCols} rows={rows} />
      </div>
      {rows.length > 0 && (
        <ChartContainer
          config={peopleCfg}
          className="aspect-auto w-full"
          style={{ height: Math.max(180, rows.length * 40) }}
        >
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={yw}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => (mobile ? cut(v, 14) : v)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="planned" fill="var(--color-planned)" radius={4} />
            <Bar dataKey="burned" fill="var(--color-burned)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead className="text-right">Plan.</TableHead>
            <TableHead className="text-right">Quem.</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.name}>
              <TableCell>{p.name}</TableCell>
              <TableCell className="text-right tabular-nums">{pts(p.planned)}</TableCell>
              <TableCell className="text-right tabular-nums">{pts(p.burned)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{pct(p.pct)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {work.length > 0 && (
        <div className="grid gap-3">
          {work.map((p) => (
            <div key={p.name} className="grid gap-2 rounded-xl border p-4 print:break-inside-avoid">
              <p className="font-medium">{p.name}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <IssueList title="Cerradas en el sprint" items={p.closed} />
                <IssueList title="Siguen abiertas" items={p.open} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function IssueList({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">
        {title} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin issues</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex items-baseline justify-between gap-3">
              <span>
                <span className="font-medium">{i.key}</span> {i.title}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {i.sp === null ? "sin estimar" : `${pts(i.sp)} SP`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border p-4 print:break-inside-avoid">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl leading-none font-bold">{value}</p>
      {extra}
    </div>
  );
}

export function StoryView({ story }: { story: Story | null | undefined }) {
  if (!story)
    return <p className="text-sm text-muted-foreground">Este informe no tiene lectura.</p>;
  return (
    <div className="report-story grid gap-2 rounded-xl bg-secondary/60 p-4">
      <p className="leading-relaxed">{story.resumen}</p>
      {(story.puntos ?? []).length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {(story.puntos ?? []).map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
