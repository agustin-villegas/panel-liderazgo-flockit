"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMe } from "@/hooks/use-me";
import { post } from "@/lib/api/client";

import { PasswordDialog } from "./password-dialog";

const ROLES: Record<string, string> = {
  admin: "Admin",
  team_manager: "Team Manager",
  cliente: "Cliente",
};

export function Topbar() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [pwd, setPwd] = useState(false);

  async function logout() {
    await post("/auth/logout").catch(() => undefined);
    qc.clear(); // no dejar datos del usuario anterior en memoria
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mi perfil" />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand text-xs text-white">
              {(me?.name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* base-ui: el Label tiene que vivir dentro de un Group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Mi perfil
            </DropdownMenuLabel>
            <div className="grid gap-0.5 px-2 pb-2 text-sm">
              <span className="font-medium">{me?.name}</span>
              <span className="truncate text-muted-foreground">{me?.email}</span>
              <span className="text-xs text-primary">{ROLES[me?.role ?? ""] ?? ""}</span>
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPwd(true)}>
            <KeyRound className="size-4" />
            Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PasswordDialog open={pwd} onClose={() => setPwd(false)} />
    </header>
  );
}
