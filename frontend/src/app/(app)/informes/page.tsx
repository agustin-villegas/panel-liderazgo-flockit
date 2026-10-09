"use client";

import { useQuery } from "@tanstack/react-query";
import { FilePlus2, FileText } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "@/components/panel/error-state";
import { ExportButtons } from "@/components/panel/export-buttons";
import { PageHeader } from "@/components/panel/page-header";
import { TableCard } from "@/components/panel/table-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty } from "@/components/viz/empty";
import { api, type ReportRow } from "@/lib/api/client";
import type { Col } from "@/lib/export";
import { day, pct } from "@/lib/format";

const AUD: Record<string, string> = { equipo: "Equipo", cliente: "Cliente", gerencia: "Gerencia" };

const cols: Col<ReportRow>[] = [
  { label: "Informe", value: (r) => r.title },
  { label: "Proyecto", value: (r) => r.project },
  { label: "Audiencia", value: (r) => AUD[r.audience] },
  { label: "Cumplimiento", value: (r) => pct(r.pct) },
  { label: "Fecha", value: (r) => day(r.created_at) },
  { label: "Autor", value: (r) => r.author },
];

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["informes"],
    queryFn: () => api<ReportRow[]>("/informes"),
  });

  return (
    <>
      <PageHeader
        title="Informes"
        description="Informes de sprint con lectura redactada por IA. Cada informe guardado es una foto que no cambia."
        actions={
          <Button variant="secondary" nativeButton={false} render={<Link href="/informes/nuevo" />}>
            <FilePlus2 className="size-4" /> Nuevo informe
          </Button>
        }
      />

      <TableCard
        title="Historial"
        section="informes"
        actions={<ExportButtons name="informes" section="informes" cols={cols} rows={data ?? []} />}
      >
        {error ? (
          <ErrorState
            message={`No se pudieron cargar los informes: ${error.message}`}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <Skeleton className="h-32" />
        ) : data?.length === 0 ? (
          <Empty
            icon={FileText}
            title="Todavía no hay informes"
            hint="Generá el primero con “Nuevo informe”."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Informe</TableHead>
                <TableHead>Audiencia</TableHead>
                <TableHead className="text-right">Cumplimiento</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Autor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link href={`/informes/${r.id}`} className="hover:underline">
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>{AUD[r.audience]}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {pct(r.pct)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{day(r.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.author}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  );
}
