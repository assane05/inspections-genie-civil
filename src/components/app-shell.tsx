import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="bg-background">
        <Topbar />
        <div className="relative min-h-[calc(100vh-4rem)]">
          <div className="pointer-events-none absolute inset-0 grid-fade opacity-20" />
          <div className="relative">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
