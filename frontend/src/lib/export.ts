export type Col<T> = { label: string; value: (row: T) => string | number | null | undefined };

/** Excel: CSV con BOM (abre directo en Excel con tildes y separador correctos). */
export function toExcel<T>(name: string, cols: Col<T>[], rows: T[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [cols.map((c) => esc(c.label)).join(";")];
  for (const r of rows) lines.push(cols.map((c) => esc(c.value(r))).join(";"));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `${name}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

/** PDF: imprime solo la sección marcada (el navegador ofrece "Guardar como PDF"). */
export function toPdf(section: string) {
  const el = document.querySelector<HTMLElement>(`[data-section="${section}"]`);
  if (el) el.dataset.printing = "1";
  document.body.dataset.print = "1";
  const done = () => {
    delete document.body.dataset.print;
    if (el) delete el.dataset.printing;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  // dos frames: el CSS de impresión tiene que aplicar antes de que Chrome saque la foto
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
}
