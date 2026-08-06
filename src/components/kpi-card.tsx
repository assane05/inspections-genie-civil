import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  delta,
  suffix,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  delta?: number;
  suffix?: string;
  icon: LucideIcon;
  accent?: "primary" | "info" | "warning" | "destructive";
}) {
  const positive = (delta ?? 0) >= 0;
  const accentClasses: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary ring-primary/30",
    info: "from-info/25 to-transparent text-info ring-info/30",
    warning: "from-warning/25 to-transparent text-warning ring-warning/30",
    destructive: "from-destructive/25 to-transparent text-destructive ring-destructive/30",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
              {value}
            </span>
            {suffix && (
              <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
            )}
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                positive
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {positive ? "+" : ""}
              {delta}%
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
            accentClasses[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
