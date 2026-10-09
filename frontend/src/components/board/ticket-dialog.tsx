"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Ticket } from "@/lib/api/client";
import { day, pts } from "@/lib/format";

import { LANES, type LaneKey } from "./lanes";

export function TicketDialog({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const lane = ticket ? LANES[ticket.lane as LaneKey] : null;
  const rows: [string, string][] = ticket
    ? [
        ["Estado", ticket.status],
        ["Responsable", ticket.assignee ?? "Sin asignar"],
        ["Story points", ticket.sp === null ? "Sin estimar" : pts(ticket.sp)],
        ["Prioridad", ticket.priority],
        ["Tipo", ticket.type],
        ["Actualizada", day(ticket.updated)],
      ]
    : [];

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ticket?.key}
            {lane && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className={`size-2 rounded-full ${lane.dot}`} /> {lane.label}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {ticket?.title}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        {!!ticket?.labels.length && (
          <div className="flex flex-wrap gap-1">
            {ticket.labels.map((l) => (
              <Badge key={l} variant="secondary">
                {l}
              </Badge>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
