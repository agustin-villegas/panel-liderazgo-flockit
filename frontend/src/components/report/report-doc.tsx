"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { LightBadge } from "@/components/panel/light-badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportData, Story } from "@/lib/api/client";
import { day, month, pct, pts } from "@/lib/format";

const AUD: Record<string, string> = { equipo: "Equipo", cliente: "Cliente", gerencia: "Gerencia" };
const tone = (v: number | null) =>
  v === null ? "var(--idle)" : v >= 0.85 ? "var(--ok)" : v >= 0.7 ? "var(--warn)" : "var(--crit)";

type Props = {
  data: ReportData;
  audience: string;
  date?: string;
  author?: string;
  story: React.ReactNode; // lectura o edición, según la pantalla
};

/** El documento del informe (pantalla y PDF). Los números vienen del motor. */
export function ReportDoc({ data, audience, date, author, story }: Props) {
  const s = data.sprint;
  const trend = data.trend.map((t) => ({
    name: t.name.replace(/^.*?Sprint\s*/i, "S"),
    pct: t.pct === null ? 0 : Math.round(t.pct * 100),
    raw: t.pct,
  }));

  return (
    <article
      data-section="informe"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <header className="bg-brand flex flex-wrap items-end justify-between gap-4 px-8 py-6 text-white">
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

      <div className="grid gap-8 p-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="grid gap-2">
            <h3 className="font-semibold">Tendencia de cumplimiento</h3>
            <ChartContainer config={{ pct: { label: "Cumplimiento %" } }} className="h-56 w-full">
              <BarChart data={trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} unit="%" width={40} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pct" radius={4}>
                  {trend.map((t) => (
                    <Cell key={t.name} fill={tone(t.raw)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
          <div className="grid content-start gap-2">
            <h3 className="font-semibold">Por persona</h3>
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
                {s.people.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{pts(p.planned)}</TableCell>
                    <TableCell className="text-right">{pts(p.burned)}</TableCell>
                    <TableCell className="text-right font-semibold">{pct(p.pct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="grid gap-2">
          <h3 className="font-semibold">Pendientes del sprint ({data.pending.length})</h3>
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
                    <TableCell className="text-right">{p.sp === null ? "—" : pts(p.sp)}</TableCell>
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

function Kpi({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border p-4">
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
    <div className="grid gap-2 rounded-xl bg-secondary/60 p-4">
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
