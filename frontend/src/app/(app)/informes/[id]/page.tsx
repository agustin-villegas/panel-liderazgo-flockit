"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { ErrorState } from "@/components/panel/error-state";
import { ReportDoc, StoryView } from "@/components/report/report-doc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Report } from "@/lib/api/client";
import { toPdf } from "@/lib/export";

export default function ReportPage({ params }: PageProps<"/informes/[id]">) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["informe", id],
    queryFn: () => api<Report>(`/informes/${id}`),
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/informes"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Informes
        </Link>
        <Button onClick={() => toPdf("informe")} disabled={!data}>
          <FileDown className="size-4" /> Exportar PDF
        </Button>
      </div>
      {isLoading && <Skeleton className="h-[600px] rounded-2xl" />}
      {error && (
        <Card>
          <ErrorState message={error.message} onRetry={() => refetch()} />
        </Card>
      )}
      {data && (
        <ReportDoc
          data={data.data}
          audience={data.audience}
          date={data.created_at}
          author={data.author}
          story={<StoryView story={data.story} />}
        />
      )}
    </>
  );
}
