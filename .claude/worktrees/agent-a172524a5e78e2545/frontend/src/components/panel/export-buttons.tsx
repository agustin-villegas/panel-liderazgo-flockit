"use client";

import { FileDown, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toExcel, toPdf, type Col } from "@/lib/export";

type Props<T> = { name: string; section: string; cols: Col<T>[]; rows: T[] };

export function ExportButtons<T>({ name, section, cols, rows }: Props<T>) {
  return (
    <div className="flex gap-1 print:hidden">
      <Button variant="ghost" size="sm" onClick={() => toExcel(name, cols, rows)}>
        <FileSpreadsheet className="size-4" /> Excel
      </Button>
      <Button variant="ghost" size="sm" onClick={() => toPdf(section)}>
        <FileDown className="size-4" /> PDF
      </Button>
    </div>
  );
}
