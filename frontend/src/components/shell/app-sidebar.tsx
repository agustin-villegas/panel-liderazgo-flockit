"use client";

import {
  FileBarChart,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  PlugZap,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useMe } from "@/hooks/use-me";

const MAIN = [
  { href: "/", label: "Panel de cartera", icon: LayoutDashboard },
  { href: "/tableros", label: "Tableros de Jira", icon: KanbanSquare },
  { href: "/informes", label: "Informes", icon: FileBarChart },
];
const CONFIG = [
  { href: "/configuracion/conexiones", label: "Conexiones", icon: PlugZap },
  { href: "/configuracion/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/configuracion/usuarios", label: "Usuarios", icon: Users },
];

export function AppSidebar() {
  const path = usePathname();
  const { data: me } = useMe();

  const item = ({ href, label, icon: Icon }: (typeof MAIN)[number]) => {
    const active =
      href === "/" ? path === "/" || path.startsWith("/proyectos") : path.startsWith(href);
    return (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton isActive={active} tooltip={label} render={<Link href={href} />}>
          <Icon />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold text-white">
            F
          </span>
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            Panel de liderazgo
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{MAIN.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {me?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Configuración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{CONFIG.map(item)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
