import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FileText,
  ShieldCheck,
  ListChecks,
  Send,
  Download,
  FileDown,
  ArrowRight,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api-client";

interface DashboardStats {
  kpis: {
    totalForms: number;
    verifiedForms: number;
    verifiedPct: number;
    totalTasks: number;
    submittedTasks: number;
    submittedPct: number;
  };

  assignmentsDist: {
    name: string;
    value: number;
  }[];

  trend: {
    week: string;
    submitted: number;
    verified: number;
  }[];

  byGroup: {
    group: string;
    count: number;
  }[];

  recent: {
    id: string;
    name: string;
    formType: string;
    group: string;
    lastSubmission: string | null;
    week: number | null;
    status: "non_soumis" | "soumis" | "verifie" | "rejete";
  }[];
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();

  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.dashboardStats();

        setDashboardData(data);
      } catch (err) {
        console.error("Erreur chargement dashboard :", err);

        setError("Impossible de charger les données du dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const kpis = dashboardData?.kpis;
  const trend = dashboardData?.trend ?? [];
  const assignmentsDist = dashboardData?.assignmentsDist ?? [];
  const byGroup = dashboardData?.byGroup ?? [];
  const recent = dashboardData?.recent ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">Chargement du dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.inspections")}
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              {t("action.export_charts")}
            </Button>

            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_var(--color-primary)]"
            >
              <FileDown className="h-4 w-4" />
              {t("action.export_pdf")}
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-6 md:p-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("kpi.total_forms")}
            value={kpis?.totalForms ?? 0}
            icon={FileText}
            accent="info"
          />

          <KpiCard
            label={t("kpi.verified")}
            value={kpis?.verifiedForms ?? 0}
            suffix={`/ ${kpis?.totalForms ?? 0} · ${kpis?.verifiedPct ?? 0}%`}
            icon={ShieldCheck}
            accent="primary"
          />

          <KpiCard
            label={t("kpi.total_tasks")}
            value={kpis?.totalTasks ?? 0}
            icon={ListChecks}
            accent="warning"
          />

          <KpiCard
            label={t("kpi.submitted_tasks")}
            value={kpis?.submittedTasks ?? 0}
            suffix={`/ ${kpis?.totalTasks ?? 0} · ${kpis?.submittedPct ?? 0}%`}
            icon={Send}
            accent="primary"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Trend */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">{t("chart.trend")}</h3>

                <p className="text-xs text-muted-foreground">{t("common.this_month")}</p>
              </div>

              <Badge variant="outline" className="border-primary/30 text-primary">
                Live
              </Badge>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend}
                  margin={{
                    left: -20,
                    right: 8,
                    top: 8,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />

                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>

                    <linearGradient id="gVer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />

                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="week"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{
                      color: "var(--color-muted-foreground)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="submitted"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#gSub)"
                  />

                  <Area
                    type="monotone"
                    dataKey="verified"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="url(#gVer)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assignments */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <h3 className="font-display text-base font-semibold">{t("chart.assignments")}</h3>

            <p className="text-xs text-muted-foreground">{t("common.this_month")}</p>

            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assignmentsDist}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {assignmentsDist.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "var(--color-primary)" : "var(--color-chart-4)"}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 space-y-2">
              {assignmentsDist.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: i === 0 ? "var(--color-primary)" : "var(--color-chart-4)",
                      }}
                    />

                    <span className="text-muted-foreground">{d.name}</span>
                  </div>

                  <span className="font-mono text-sm font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By group + Recent */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* By group */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm lg:col-span-1">
            <h3 className="font-display text-base font-semibold">{t("chart.by_group")}</h3>

            <p className="text-xs text-muted-foreground">Total inspections</p>

            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byGroup}
                  layout="vertical"
                  margin={{
                    left: 0,
                    right: 12,
                  }}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="group"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />

                  <Tooltip
                    cursor={{
                      fill: "var(--color-muted)",
                    }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />

                  <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h3 className="font-display text-base font-semibold">{t("table.recent")}</h3>

                <p className="text-xs text-muted-foreground">
                  {recent.length} soumission
                  {recent.length > 1 ? "s" : ""} récente
                  {recent.length > 1 ? "s" : ""}
                </p>
              </div>

              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                {t("common.view_all")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="pl-5">{t("table.form")}</TableHead>

                    <TableHead>{t("table.week")}</TableHead>

                    <TableHead>{t("table.assignments")}</TableHead>

                    <TableHead>{t("table.status")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Aucune fiche récente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recent.slice(0, 6).map((r) => (
                      <TableRow key={r.id} className="border-border/40">
                        <TableCell className="pl-5 font-medium">
                          <div>{r.name}</div>

                          <div className="text-[11px] text-muted-foreground">
                            {r.lastSubmission
                              ? new Date(r.lastSubmission).toLocaleDateString("fr-FR")
                              : "-"}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono text-sm">{r.week ? `S${r.week}` : "-"}</span>
                        </TableCell>

                        <TableCell className="font-mono text-sm">{r.group}</TableCell>

                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();

  const map: Record<
    string,
    {
      label: string;
      cls: string;
    }
  > = {
    not_submitted: {
      label: t("status.not_submitted"),
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },

    pending: {
      label: t("status.pending"),
      cls: "border-warning/40 bg-warning/10 text-warning",
    },

    in_progress: {
      label: "En cours",
      cls: "border-warning/40 bg-warning/10 text-warning",
    },

    verified: {
      label: t("status.verified"),
      cls: "border-success/40 bg-success/10 text-success",
    },

    rejected: {
      label: "Rejetée",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  };

  const normalizedStatus = String(status).trim().toLowerCase();
  const s = map[normalizedStatus];

  if (!s) {
    console.warn("Statut inconnu :", status);

    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/30 text-muted-foreground font-medium"
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
        Inconnu
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`${s.cls} font-medium`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}

export { StatusBadge };
