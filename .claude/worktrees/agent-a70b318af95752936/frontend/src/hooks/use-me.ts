"use client";

import { useQuery } from "@tanstack/react-query";

import { api, type Me } from "@/lib/api/client";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me"), staleTime: Infinity });
}
