import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, FileText, ImageIcon, LayoutDashboard, Plane, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import LogoLas from "@/assets/logo_blanc.png";

export function SupervisorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout("manual");
    navigate({ to: "/", replace: true });
  }

  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { t } = useI18n();

  const items = [
    { title: t("nav.dashboard"), url: "/supervisor/dashboard", icon: LayoutDashboard },
    { title: t("nav.tasks"), url: "/supervisor/tasks", icon: ClipboardList },
    { title: t("nav.available_forms"), url: "/supervisor/forms", icon: FileText },
    { title: t("nav.gallery"), url: "/supervisor/gallery", icon: ImageIcon },
  ];

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/supervisor/tasks" className="flex items-center gap-3 px-1 py-1">
          <div className="relative flex h-auto w-auto items-center justify-center  text-primary-foreground">
            {/* <Plane className="h-5 w-5 -rotate-12" /> */}
            <img src={LogoLas} alt="" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold tracking-tight">LAS</span>
              <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
                Superviseur
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
              {t("nav.inspections")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="group/menu-item h-9 rounded-lg data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium hover:bg-sidebar-accent/60"
                    >
                      <Link to={item.url}>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground/70 group-hover/menu-item:text-sidebar-foreground"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                        {active && !collapsed && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void handleLogout()}
              className="h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
            >
              <span className="flex h-6 w-6 items-center justify-center">
                <LogOut className="h-4 w-4" />
              </span>
              {!collapsed && <span className="text-sm">{t("topbar.logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
