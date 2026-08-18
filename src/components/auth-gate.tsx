import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, homeRouteFor } from "@/lib/auth";
import type { Role } from "@/lib/auth-api";

const PUBLIC_ROUTES = ["/"];

function requiredRoleFor(pathname: string): Role | null {
  if (pathname.startsWith("/supervisor")) return "supervisor";
  if (PUBLIC_ROUTES.includes(pathname)) return null;
  return "admin";
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const required = requiredRoleFor(pathname);

  useEffect(() => {
    if (!ready || !required) return;
    if (!user) {
      navigate({ to: "/", replace: true });
      return;
    }
    if (user.role !== required) {
      navigate({ to: homeRouteFor(user.role), replace: true });
    }
  }, [ready, user, required, pathname, navigate]);

  if (required && (!ready || !user || user.role !== required)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
