"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LightBadge } from "@/components/panel/light-badge";
import type { MonthRow, SprintRow } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, month, pct, pts } from "@/lib/format";

export const sprintCols: Col<SprintRow>[] = [
  { label: "Sprint", value: (s) => s.name },
  { label: "Inicio", value: (s) => day(s.start) },
  { label: "Fin", value: (s) => day(s.end) },
  { label: "Planificados", value: (s) => s.planned },
  { label: "Quemados", value: (s) => s.burned },
  { label: "Cumplimiento", value: (s) => pct(s.pct) },
  { label: "Sin estimar", value: (s) => s.unestimated },
];

export function SprintTable({
  rows,
  onOpen,
}: {
  rows: SprintRow[];
  onOpen: (s: SprintRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sprint</TableHead>
          <TableHead>Fechas</TableHead>
          <TableHead className="text-right">Plan.</TableHead>
          <TableHead className="text-right">Quem.</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="print:hidden" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...rows].reverse().map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">
              {s.name}
              {s.provisional && (
                <Badge variant="secondary" className="ml-2">
                  En curso
                </Badge>
              )}
              {s.unestimated > 0 && (
                <Badge variant="outline" className="ml-2" title="Issues sin story points">
                  {s.unestimated} sin estimar
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {day(s.start)} – {day(s.end)}
            </TableCell>
            <TableCell className="text-right">{pts(s.planned)}</TableCell>
            <TableCell className="text-right">{pts(s.burned)}</TableCell>
            <TableCell className="text-right font-semibold">{pct(s.pct)}</TableCell>
            <TableCell>
              <LightBadge light={s.light} />
            </TableCell>
            <TableCell className="text-right print:hidden">
              <Button variant="ghost" size="sm" onClick={() => onOpen(s)}>
                Ver detalle
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const monthCols: Col<MonthRow>[] = [
  { label: "Mes", value: (m) => month(m.month) },
  { label: "Sprints", value: (m) => m.sprints },
  { label: "Planificados", value: (m) => m.planned },
  { label: "Quemados", value: (m) => m.burned },
  { label: "Cumplimiento", value: (m) => pct(m.pct) },
];

export function MonthTable({ rows }: { rows: MonthRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mes</TableHead>
          <TableHead className="text-right">Sprints</TableHead>
          <TableHead className="text-right">Plan.</TableHead>
          <TableHead className="text-right">Quem.</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...rows].reverse().map((m) => (
          <TableRow key={m.month}>
            <TableCell className="font-medium capitalize">{month(m.month)}</TableCell>
            <TableCell className="text-right">{m.sprints}</TableCell>
            <TableCell className="text-right">{pts(m.planned)}</TableCell>
            <TableCell className="text-right">{pts(m.burned)}</TableCell>
            <TableCell className="text-right font-semibold">{pct(m.pct)}</TableCell>
            <TableCell>
              <LightBadge light={m.light} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type Person = SprintRow["people"][number];

export const personCols: Col<Person>[] = [
  { label: "Persona", value: (p) => p.name },
  { label: "Planificados", value: (p) => p.planned },
  { label: "Quemados", value: (p) => p.burned },
  { label: "Cumplimiento", value: (p) => pct(p.pct) },
];

export function PeopleTable({ rows }: { rows: Person[] }) {
  return (
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
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell className="text-right">{pts(p.planned)}</TableCell>
            <TableCell className="text-right">{pts(p.burned)}</TableCell>
            <TableCell className="text-right font-semibold">{pct(p.pct)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
