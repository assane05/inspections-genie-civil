import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, ListChecks, Send, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/lib/queries/assignments";
import {
  applyFilters,
  emptyFilters,
  dueState,
  progressByForm,
  submissionProgress,
  type TaskFilters,
} from "@/lib/tasks";

export const Route = createFileRoute("/supervisor/dashboard")({
  component: SupervisorDashboard,
  head: () => ({
    meta: [
      { title: "Tableau de bord — LAS Superviseur" },
      {
        name: "description",
        content: "Vue de synthèse des fiches et tâches soumises côté superviseur.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SupervisorDashboard() {
  // Filtres année/bimestre/formulaire uniquement — le reste (statut, semaine, recherche)
  // reste "all"/vide pour que la synthèse porte sur toutes les tâches de ces critères.
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const set = (key: keyof TaskFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  // Même source et même fonction de filtrage que la liste des tâches (sprint 11) et le
  // compteur "X of Y" par formulaire (sprint 13) — garantit des chiffres cohérents partout.
  const { data: scoped = [] } = useAssignments();
  const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);

  const forms = useMemo(() => [...new Set(scoped.map((r) => r.form))].sort(), [scoped]);
  const years = useMemo(
    () => [...new Set(scoped.map((r) => r.year))].sort((a, b) => b - a),
    [scoped],
  );

  const { submitted, total } = submissionProgress(filtered);
  const submittedPct = total ? Math.round((submitted / total) * 100) : 0;
  const overdueCount = filtered.filter((r) => dueState(r) === "overdue").length;
  const byForm = useMemo(() => progressByForm(filtered), [filtered]);

  const byBimester = useMemo(() => {
    const map = new Map<number, { submitted: number; total: number }>();
    for (const t of filtered) {
      const entry = map.get(t.bimester) ?? { submitted: 0, total: 0 };
      entry.total += 1;
      if (t.status === "pending" || t.status === "verified") entry.submitted += 1;
      map.set(t.bimester, entry);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bimester, v]) => ({ bimester: `B${bimester}`, ...v }));
  }, [filtered]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Superviseur"
        title="Tableau de bord"
        subtitle="Synthèse des fiches et tâches soumises"
      />

      <div className="space-y-6 p-6 md:p-8">
        {/* Filtres — mêmes critères que la liste des tâches, pour des chiffres cohérents */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={filters.form} onValueChange={(v) => set("form", v)}>
            <SelectTrigger className="h-9 bg-background/60">
              <SelectValue placeholder="Formulaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formulaires</SelectItem>
              {forms.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.year} onValueChange={(v) => set("year", v)}>
            <SelectTrigger className="h-9 bg-background/60">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les années</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.bimester} onValueChange={(v) => set("bimester", v)}>
            <SelectTrigger className="h-9 bg-background/60">
              <SelectValue placeholder="Bimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les bimestres</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <SelectItem key={b} value={String(b)}>
                  Bimestre {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total fiches" value={total} icon={ClipboardList} accent="info" />
          <KpiCard
            label="Tâches soumises"
            value={submitted}
            suffix={`/ ${total} · ${submittedPct}%`}
            icon={Send}
            accent="primary"
          />
          <KpiCard
            label="Formulaires distincts"
            value={byForm.length}
            icon={ListChecks}
            accent="warning"
          />
          <KpiCard
            label="En retard"
            value={overdueCount}
            icon={TriangleAlert}
            accent="destructive"
          />
        </div>

        {/* Par période (bimestre) */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="font-display text-base font-semibold">Par période (bimestre)</h3>
          <p className="text-xs text-muted-foreground">Soumises vs total, filtres appliqués</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBimester} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="bimester"
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
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--color-muted-foreground)"
                  radius={[6, 6, 0, 0]}
                  opacity={0.35}
                />
                <Bar dataKey="submitted" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Par formulaire */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <div className="border-b border-border/60 p-5">
            <h3 className="font-display text-base font-semibold">Par formulaire</h3>
            <p className="text-xs text-muted-foreground">
              {byForm.length} formulaire(s) — filtres appliqués
            </p>
          </div>
          <div className="divide-y divide-border/40">
            {byForm.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">Aucune tâche pour ces filtres.</p>
            )}
            {byForm.map((f) => {
              const pct = f.total ? Math.round((f.submitted / f.total) * 100) : 0;
              return (
                <div key={f.form} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.form}</div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-medium text-muted-foreground">
                    {f.submitted} of {f.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
