import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: ReactNode;
  section: string;
  /** A la derecha: ExportButtons y/o acción primaria. */
  actions?: ReactNode;
  children: ReactNode;
};

/** Card de tabla: header que wrapea (título izq, acciones der). */
export function TableCard({ title, section, actions, children }: Props) {
  return (
    <Card data-section={section}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
