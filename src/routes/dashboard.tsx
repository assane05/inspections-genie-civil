import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileDown,
  FileText,
  ListChecks,
  Send,
  ShieldCheck,
  XCircle,
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

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type InspectionStatus = "non_soumis" | "soumis" | "verifie" | "rejete";

interface DashboardStats {
  kpis: {
    totalForms: number;
    submittedForms: number;
    verifiedForms: number;
    rejectedForms: number;
    verifiedPct: number;
    compliancePct: number;
    totalTasks: number;
    submittedTasks: number;
    overdueTasks: number;
    submittedPct: number;
  };

  trend: {
    week: string;
    submitted: number;
    verified: number;
    rejected?: number;
  }[];

  byGroup: {
    group: string;
    count: number;
  }[];

  byStatus: {
    name: string;
    value: number;
    status?: InspectionStatus;
  }[];

  compliance: {
    name: string;
    value: number;
  }[];

  assignmentsDist: {
    name: string;
    value: number;
  }[];

  recent: {
    id: string;
    name: string;
    formType: string;
    group: string;
    lastSubmission: string | null;
    week: number | null;
    status: InspectionStatus;
  }[];
}

function Dashboard() {
  const { t } = useI18n();

  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState("all");
  const [bimester, setBimester] = useState("all");
  const [group, setGroup] = useState("all");
  const [formType, setFormType] = useState("all");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.dashboardStats({
          year,
          bimester,
          group,
          formTypeId: formType,
        });

        setDashboardData(data);
      } catch (err) {
        console.error("Erreur chargement dashboard :", err);
        setError("Impossible de charger les données du dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [year, bimester, group, formType]);

  const kpis = dashboardData?.kpis;

  const trend = dashboardData?.trend ?? [];
  const byGroup = dashboardData?.byGroup ?? [];
  const byStatus = dashboardData?.byStatus ?? [];
  const compliance = dashboardData?.compliance ?? [];
  const assignmentsDist = dashboardData?.assignmentsDist ?? [];
  const recent = dashboardData?.recent ?? [];

  /**
   * Les options disponibles pour les filtres.
   *
   * Elles sont construites à partir des données reçues du backend.
   */
  const groups = useMemo(() => {
    return Array.from(new Set(byGroup.map((item) => item.group).filter(Boolean)));
  }, [byGroup]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return [String(currentYear - 2), String(currentYear - 1), String(currentYear)];
  }, []);

  /**
   * Pour le moment, les filtres sont préparés côté interface.
   *
   * Le filtrage réel sera idéalement fait côté backend afin d'avoir
   * des statistiques exactes sur de gros volumes de données.
   */
  // const filteredRecent = useMemo(() => {
  //   return recent.filter((item) => {
  //     const matchesGroup = group === "all" || item.group === group;

  //     const matchesForm = formType === "all" || item.formType === formType;

  //     return matchesGroup && matchesForm;
  //   });
  // }, [recent, group, formType]);

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
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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
              className="gap-2 bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_var(--color-primary)] hover:bg-primary/90"
            >
              <FileDown className="h-4 w-4" />
              {t("action.export_pdf")}
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* =========================================================
            FILTRES
        ========================================================= */}

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Filtres du tableau de bord</h3>

            <p className="text-xs text-muted-foreground">
              Affinez la période et le périmètre des statistiques.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Année */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Année
              </label>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Toutes les années</option>

                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Bimestre */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Bimestre
              </label>

              <select
                value={bimester}
                onChange={(e) => setBimester(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous les bimestres</option>
                <option value="1">B1</option>
                <option value="2">B2</option>
                <option value="3">B3</option>
                <option value="4">B4</option>
                <option value="5">B5</option>
                <option value="6">B6</option>
              </select>
            </div>

            {/* Groupe */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Groupe
              </label>

              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous les groupes</option>

                {dashboardData?.filterOptions.groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Formulaire */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Formulaire
              </label>

              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous les formulaires</option>

                {dashboardData?.filterOptions.formTypes.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================
            KPI
        ========================================================= */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total fiches"
            value={kpis?.totalForms ?? 0}
            icon={FileText}
            accent="info"
          />

          <KpiCard
            label="Soumises"
            value={kpis?.submittedForms ?? 0}
            icon={Send}
            accent="primary"
          />

          <KpiCard
            label="Vérifiées"
            value={kpis?.verifiedForms ?? 0}
            suffix={`${kpis?.verifiedPct ?? 0}%`}
            icon={ShieldCheck}
            accent="primary"
          />

          <KpiCard
            label="Rejetées"
            value={kpis?.rejectedForms ?? 0}
            icon={XCircle}
            accent="warning"
          />

          {/* <KpiCard
            label="Taux de conformité"
            value={`${kpis?.compliancePct ?? 0}%`}
            icon={CheckCircle2}
            accent="primary"
          /> */}

          {/* <KpiCard
            label="Tâches"
            value={kpis?.totalTasks ?? 0}
            suffix={kpis?.overdueTasks ? `${kpis.overdueTasks} en retard` : "Aucune en retard"}
            icon={ListChecks}
            accent={kpis?.overdueTasks ? "warning" : "primary"}
          /> */}
        </div>

        {/* =========================================================
            ALERT TACHES
        ========================================================= */}

        {(kpis?.overdueTasks ?? 0) > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-warning/15 p-2">
                <Clock3 className="h-4 w-4 text-warning" />
              </div>

              <div>
                <p className="font-medium">Tâches en retard</p>

                <p className="text-sm text-muted-foreground">
                  {kpis?.overdueTasks} tâche
                  {kpis?.overdueTasks !== 1 ? "s" : ""} nécessite
                  {kpis?.overdueTasks !== 1 ? "nt" : ""} une attention.
                </p>
              </div>
            </div>

            <Link to="/tasks">
              <Button variant="outline" size="sm" className="gap-2">
                Voir les tâches
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* =========================================================
            EVOLUTION + STATUT
        ========================================================= */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Evolution */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Évolution des inspections</h3>

                <p className="text-xs text-muted-foreground">
                  Soumissions, vérifications et rejets
                </p>
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
                    <linearGradient id="gSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />

                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>

                    <linearGradient id="gVerified" x1="0" y1="0" x2="0" y2="1">
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
                  />

                  <Area
                    type="monotone"
                    dataKey="submitted"
                    name="Soumises"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#gSubmitted)"
                  />

                  <Area
                    type="monotone"
                    dataKey="verified"
                    name="Vérifiées"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    fill="url(#gVerified)"
                  />

                  <Area
                    type="monotone"
                    dataKey="rejected"
                    name="Rejetées"
                    stroke="var(--color-destructive)"
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statuts */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <h3 className="font-display text-base font-semibold">Statut des inspections</h3>

            <p className="text-xs text-muted-foreground">Répartition globale</p>

            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus}
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {byStatus.map((item, index) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          item.status === "verifie"
                            ? "var(--color-success)"
                            : item.status === "rejete"
                              ? "var(--color-destructive)"
                              : item.status === "soumis"
                                ? "var(--color-primary)"
                                : "var(--color-chart-4)"
                        }
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

            <div className="space-y-2">
              {byStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>

                  <span className="font-mono font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================
            GROUPE + CONFORMITE
        ========================================================= */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Groupes */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm lg:col-span-2">
            <h3 className="font-display text-base font-semibold">Inspections par groupe</h3>

            <p className="text-xs text-muted-foreground">Nombre total d'inspections</p>

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
                    width={110}
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

                  <Bar
                    dataKey="count"
                    name="Inspections"
                    fill="var(--color-primary)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conformité */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Conformité</h3>

                <p className="text-xs text-muted-foreground">Résultats des inspections</p>
              </div>

              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-8 flex justify-center">
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 border-primary/15">
                <span className="font-display text-3xl font-bold">{kpis?.compliancePct ?? 0}%</span>

                <span className="text-xs text-muted-foreground">conforme</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {compliance.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.name}</span>

                  <span className="font-mono text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================
            DERNIERES INSPECTIONS
        ========================================================= */}

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Dernières inspections</h3>

              <p className="text-xs text-muted-foreground">
                {recent.length} inspection
                {recent.length > 1 ? "s" : ""} récente
                {recent.length > 1 ? "s" : ""}
              </p>
            </div>

            <Link to="/inspections">
              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
                Voir toutes les inspections
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-5">Formulaire</TableHead>

                  <TableHead>Groupe</TableHead>

                  <TableHead>Semaine</TableHead>

                  <TableHead>Date</TableHead>

                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Aucune inspection récente.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.slice(0, 8).map((item) => (
                    <TableRow key={item.id} className="border-border/40">
                      <TableCell className="pl-5 font-medium">
                        <div>{item.name}</div>

                        <div className="text-[11px] text-muted-foreground">{item.formType}</div>
                      </TableCell>

                      <TableCell className="font-mono text-sm">{item.group}</TableCell>

                      <TableCell>
                        <span className="font-mono text-sm">
                          {item.week ? `S${item.week}` : "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        {item.lastSubmission
                          ? new Date(item.lastSubmission).toLocaleDateString("fr-FR")
                          : "-"}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* =========================================================
            RESUME TACHES
        ========================================================= */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>

              <div>
                <h3 className="font-display text-base font-semibold">Suivi des tâches</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {kpis?.submittedTasks ?? 0} tâche
                  {(kpis?.submittedTasks ?? 0) !== 1 ? "s" : ""} traitée
                  {(kpis?.submittedTasks ?? 0) !== 1 ? "s" : ""} sur {kpis?.totalTasks ?? 0}.
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, kpis?.submittedPct ?? 0)}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Progression</span>
              <span>{kpis?.submittedPct ?? 0}%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-success/10 p-2.5">
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>

              <div>
                <h3 className="font-display text-base font-semibold">Vérification</h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {kpis?.verifiedForms ?? 0} fiche
                  {(kpis?.verifiedForms ?? 0) !== 1 ? "s" : ""} vérifiée
                  {(kpis?.verifiedForms ?? 0) !== 1 ? "s" : ""} sur {kpis?.submittedForms ?? 0}{" "}
                  soumise
                  {(kpis?.submittedForms ?? 0) !== 1 ? "s" : ""}.
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{
                  width: `${Math.min(100, kpis?.verifiedPct ?? 0)}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Taux de vérification</span>
              <span>{kpis?.verifiedPct ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InspectionStatus | string }) {
  const map: Record<
    string,
    {
      label: string;
      cls: string;
    }
  > = {
    non_soumis: {
      label: "Non soumise",
      cls: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
    },

    soumis: {
      label: "Soumise",
      cls: "border-primary/30 bg-primary/10 text-primary",
    },

    verifie: {
      label: "Vérifiée",
      cls: "border-success/40 bg-success/10 text-success",
    },

    rejete: {
      label: "Rejetée",
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
    },
  };

  const normalizedStatus = String(status).trim().toLowerCase();

  const item = map[normalizedStatus];

  if (!item) {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/30 font-medium text-muted-foreground"
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
        Inconnu
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`${item.cls} font-medium`}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {item.label}
    </Badge>
  );
}

export { StatusBadge };
