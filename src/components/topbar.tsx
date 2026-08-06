import { Bell, LogOut, Search, User, Settings, Languages, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { currentUser } from "@/lib/mock-data";

type TopbarUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
  groups?: string[];
};

export function Topbar({ user: fallbackUser = currentUser }: { user?: TopbarUser } = {}) {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { user: sessionUser, logout } = useAuth();
  const user: TopbarUser = sessionUser ?? fallbackUser;

  async function handleLogout() {
    await logout("manual");
    navigate({ to: "/", replace: true });
  }


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-muted" />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("topbar.search")}
          className="h-9 border-border/60 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-lg px-2.5">
              <Languages className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{lang}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("topbar.language")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLang("fr")} className="justify-between">
              Français
              {lang === "fr" && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("en")} className="justify-between">
              English
              {lang === "en" && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-lg p-0">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" />
        </Button>

        <div className="mx-1 hidden h-6 w-px bg-border/70 sm:block" />

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/60">
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/40 text-xs font-semibold text-primary-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {user.role}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-10 w-10 border border-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/40 text-sm font-semibold text-primary-foreground">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/10 text-[10px] uppercase tracking-wider text-primary"
                  >
                    {user.role}
                  </Badge>
                  {user.groups?.slice(0, 2).map((g) => (
                    <Badge
                      key={g}
                      variant="outline"
                      className="border-border/60 bg-muted/50 text-[10px] tracking-wide text-muted-foreground"
                    >
                      {g}
                    </Badge>
                  ))}
                  {user.groups && user.groups.length > 2 && (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/50 text-[10px] text-muted-foreground"
                    >
                      +{user.groups.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> {t("topbar.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> {t("topbar.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> {t("topbar.logout")}
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
