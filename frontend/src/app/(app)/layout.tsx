import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-home min-h-svh">
        <Topbar />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 pb-24 md:p-6 md:pb-24">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
