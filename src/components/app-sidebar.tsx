import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  ClipboardList,
  CalendarDays,
  ImageIcon,
  ClipboardCheck,
  Plane,
  Settings,
  BookOpen,
  Layers,
  Users,
} from "lucide-react";
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
import LogoLas from "@/assets/logo.png";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { t } = useI18n();

  const primary = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.analytics"), url: "/analytics", icon: BookOpen },
  ];

  const forms = [
    { title: t("nav.available_forms"), url: "/forms/available", icon: ClipboardList },
    { title: t("nav.submissions"), url: "/forms", icon: FileText },
  ];

  const ops = [
    { title: t("nav.tasks"), url: "/tasks", icon: ListChecks },
    { title: t("nav.new_task"), url: "/tasks/new", icon: ClipboardCheck },
    { title: t("nav.planning"), url: "/planning", icon: CalendarDays },
  ];

  const misc = [
    { title: t("nav.gallery"), url: "/gallery", icon: ImageIcon },
    { title: t("nav.evaluation"), url: "/evaluation", icon: ClipboardCheck },
  ];

  const admin = [
    { title: t("nav.models"), url: "/models", icon: Layers },
    { title: t("nav.users"), url: "/users", icon: Users },
  ];

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  const Section = ({ label, items }: { label: string; items: typeof primary }) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
          {label}
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
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_20px_-4px_var(--color-primary)]">
            {/* <Plane className="h-5 w-5 -rotate-12" /> */}
            <img src={LogoLas} alt="" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold tracking-tight">LAS</span>
              <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
                Inspections
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 py-3">
        <Section label={t("nav.dashboard")} items={primary} />
        <Section label={t("nav.forms")} items={forms} />
        <Section label={t("nav.tasks")} items={ops} />
        <Section label="Divers" items={misc} />
        <Section label="Administration" items={admin} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
              <span className="flex h-6 w-6 items-center justify-center">
                <Settings className="h-4 w-4" />
              </span>
              {!collapsed && <span className="text-sm">{t("nav.settings")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
