import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SupervisorSidebar } from "@/components/supervisor-sidebar";
import { Topbar } from "@/components/topbar";
import { supervisorUser } from "@/lib/mock-data";

export function SupervisorShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <SupervisorSidebar />
      <SidebarInset className="bg-background">
        <Topbar user={supervisorUser} />
        <div className="relative min-h-[calc(100vh-4rem)]">
          <div className="pointer-events-none absolute inset-0 grid-fade opacity-20" />
          <div className="relative">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
