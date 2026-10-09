"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type Notifs } from "@/lib/api/client";

export const NOTIFS_KEY = ["notificaciones"];

/** Avisos del usuario (compartido con la campanita). */
export function useNotifs() {
  return useQuery({
    queryKey: NOTIFS_KEY,
    queryFn: () => api<Notifs>("/notificaciones"),
    refetchInterval: 60_000,
  });
}
