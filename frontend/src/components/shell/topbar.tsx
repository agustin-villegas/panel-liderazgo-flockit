"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMe } from "@/hooks/use-me";
import { post } from "@/lib/api/client";

const ROLES: Record<string, string> = {
  admin: "Admin",
  team_manager: "Team Manager",
  cliente: "Cliente",
};

export function Topbar() {
  const router = useRouter();
  const { data: me } = useMe();

  async function logout() {
    await post("/auth/logout").catch(() => undefined);
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
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta" />
          }
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand text-xs text-white">
              {(me?.name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate">{me?.email}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {ROLES[me?.role ?? ""] ?? ""}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
