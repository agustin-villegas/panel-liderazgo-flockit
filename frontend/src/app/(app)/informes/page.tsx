"use client";

import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";

import { ExportButtons } from "@/components/panel/export-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const { data, isLoading } = useQuery({
    queryKey: ["informes"],
    queryFn: () => api<ReportRow[]>("/informes"),
  });

  return (
    <>
      <section className="banner flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
          <p className="mt-1 text-white/85">
            Informes de sprint con lectura redactada por IA. Cada informe guardado es una foto que
            no cambia.
          </p>
        </div>
        <Button variant="secondary" nativeButton={false} render={<Link href="/informes/nuevo" />}>
          <FilePlus2 className="size-4" /> Nuevo informe
        </Button>
      </section>

      <Card data-section="informes">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historial</CardTitle>
          <ExportButtons name="informes" section="informes" cols={cols} rows={data ?? []} />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : data?.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay informes. Generá el primero con “Nuevo informe”.
            </p>
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
                    <TableCell className="text-right font-semibold">{pct(r.pct)}</TableCell>
                    <TableCell className="text-muted-foreground">{day(r.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.author}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
