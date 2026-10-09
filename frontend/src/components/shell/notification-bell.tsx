"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleSlash,
  Flag,
  Play,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFS_KEY, useNotifs } from "@/hooks/use-notifs";
import { post, type Notif } from "@/lib/api/client";
import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  inicio: Play,
  cierre: Flag,
  sinsp: CircleSlash,
  siniciar: CalendarClock,
  sinmov: Timer,
};

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isError } = useNotifs();
  const refresh = () => qc.invalidateQueries({ queryKey: NOTIFS_KEY });
  const readOne = useMutation({
    mutationFn: (id: string) => post(`/notificaciones/${id}/leida`),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => post("/notificaciones/leer-todas"),
    onSuccess: refresh,
  });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  function go(n: Notif) {
    if (!n.read_at) readOne.mutate(n.id);
    setOpen(false);
    router.push(n.link);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={unread ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
            title="Notificaciones"
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-4 font-semibold text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        <div className="bg-brand flex items-center justify-between px-4 py-3 text-white">
          <span className="text-sm font-semibold">Notificaciones</span>
          <Button
            variant="ghost"
            size="xs"
            className="text-white hover:bg-white/15 hover:text-white"
            disabled={unread === 0 || readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            <CheckCheck />
            Marcar todas como leídas
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isError && (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <AlertTriangle className="size-4" /> No se pudieron cargar los avisos.
            </p>
          )}
          {!isError && items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Estás al día</p>
          )}
          <ul className="divide-y">
            {items.map((n) => {
              const Icon = ICONS[n.kind] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                      !n.read_at && "bg-primary/5",
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className={cn("truncate text-sm", !n.read_at && "font-semibold")}>
                        {n.title}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                      <span className="text-[11px] text-muted-foreground">{ago(n.created_at)}</span>
                    </span>
                    {!n.read_at && (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
                        aria-label="Sin leer"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
