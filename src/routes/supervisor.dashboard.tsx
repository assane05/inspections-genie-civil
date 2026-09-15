// import { useMemo, useState } from "react";
// import { createFileRoute } from "@tanstack/react-router";
// import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// import { ClipboardList, ListChecks, Send, TriangleAlert } from "lucide-react";
// import { PageHeader } from "@/components/page-header";
// import { KpiCard } from "@/components/kpi-card";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useAssignments } from "@/lib/queries/assignments";
// import {
//   applyFilters,
//   emptyFilters,
//   dueState,
//   progressByForm,
//   submissionProgress,
//   type TaskFilters,
// } from "@/lib/tasks";

// export const Route = createFileRoute("/supervisor/dashboard")({
//   component: SupervisorDashboard,
//   head: () => ({
//     meta: [
//       { title: "Tableau de bord — LAS Superviseur" },
//       {
//         name: "description",
//         content: "Vue de synthèse des fiches et tâches soumises côté superviseur.",
//       },
//       { name: "robots", content: "noindex" },
//     ],
//   }),
// });

// function SupervisorDashboard() {
//   // Filtres année/bimestre/formulaire uniquement — le reste (statut, semaine, recherche)
//   // reste "all"/vide pour que la synthèse porte sur toutes les tâches de ces critères.
//   const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
//   const set = (key: keyof TaskFilters, value: string) =>
//     setFilters((f) => ({ ...f, [key]: value }));

//   const { data: scoped = [] } = useAssignments();
//   const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);

//   const forms = useMemo(() => [...new Set(scoped.map((r) => r.form))].sort(), [scoped]);
//   const years = useMemo(
//     () => [...new Set(scoped.map((r) => r.year))].sort((a, b) => b - a),
//     [scoped],
//   );

//   const { submitted, total } = submissionProgress(filtered);
//   const submittedPct = total ? Math.round((submitted / total) * 100) : 0;
//   const overdueCount = filtered.filter((r) => dueState(r) === "overdue").length;
//   const byForm = useMemo(() => progressByForm(filtered), [filtered]);

//   const byBimester = useMemo(() => {
//     const map = new Map<number, { submitted: number; total: number }>();
//     for (const t of filtered) {
//       const entry = map.get(t.bimester) ?? { submitted: 0, total: 0 };
//       entry.total += 1;
//       if (t.status === "pending" || t.status === "verified") entry.submitted += 1;
//       map.set(t.bimester, entry);
//     }
//     return [...map.entries()]
//       .sort((a, b) => a[0] - b[0])
//       .map(([bimester, v]) => ({ bimester: `B${bimester}`, ...v }));
//   }, [filtered]);

//   return (
//     <div className="pb-10">
//       <PageHeader
//         eyebrow="Superviseur"
//         title="Tableau de bord"
//         subtitle="Synthèse des fiches et tâches soumises"
//       />

//       <div className="space-y-6 p-6 md:p-8">
//         {/* Filtres — mêmes critères que la liste des tâches, pour des chiffres cohérents */}
//         <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//           <Select value={filters.form} onValueChange={(v) => set("form", v)}>
//             <SelectTrigger className="h-9 bg-background/60">
//               <SelectValue placeholder="Formulaire" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">Tous les formulaires</SelectItem>
//               {forms.map((f) => (
//                 <SelectItem key={f} value={f}>
//                   {f}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <Select value={filters.year} onValueChange={(v) => set("year", v)}>
//             <SelectTrigger className="h-9 bg-background/60">
//               <SelectValue placeholder="Année" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">Toutes les années</SelectItem>
//               {years.map((y) => (
//                 <SelectItem key={y} value={String(y)}>
//                   {y}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>

//           <Select value={filters.bimester} onValueChange={(v) => set("bimester", v)}>
//             <SelectTrigger className="h-9 bg-background/60">
//               <SelectValue placeholder="Bimestre" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">Tous les bimestres</SelectItem>
//               {[1, 2, 3, 4, 5, 6].map((b) => (
//                 <SelectItem key={b} value={String(b)}>
//                   Bimestre {b}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* KPIs */}
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
//           <KpiCard label="Total fiches" value={total} icon={ClipboardList} accent="info" />
//           <KpiCard
//             label="Tâches soumises"
//             value={submitted}
//             suffix={`/ ${total} · ${submittedPct}%`}
//             icon={Send}
//             accent="primary"
//           />
//           <KpiCard
//             label="Formulaires distincts"
//             value={byForm.length}
//             icon={ListChecks}
//             accent="warning"
//           />
//           <KpiCard
//             label="En retard"
//             value={overdueCount}
//             icon={TriangleAlert}
//             accent="destructive"
//           />
//         </div>

//         {/* Par période (bimestre) */}
//         <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
//           <h3 className="font-display text-base font-semibold">Par période (bimestre)</h3>
//           <p className="text-xs text-muted-foreground">Soumises vs total, filtres appliqués</p>
//           <div className="mt-4 h-64">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={byBimester} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
//                 <CartesianGrid
//                   stroke="var(--color-border)"
//                   strokeDasharray="3 3"
//                   vertical={false}
//                 />
//                 <XAxis
//                   dataKey="bimester"
//                   stroke="var(--color-muted-foreground)"
//                   fontSize={11}
//                   tickLine={false}
//                   axisLine={false}
//                 />
//                 <YAxis
//                   stroke="var(--color-muted-foreground)"
//                   fontSize={11}
//                   tickLine={false}
//                   axisLine={false}
//                   allowDecimals={false}
//                 />
//                 <Tooltip
//                   cursor={{ fill: "var(--color-muted)" }}
//                   contentStyle={{
//                     background: "var(--color-popover)",
//                     border: "1px solid var(--color-border)",
//                     borderRadius: 12,
//                     fontSize: 12,
//                   }}
//                 />
//                 <Bar
//                   dataKey="total"
//                   fill="var(--color-muted-foreground)"
//                   radius={[6, 6, 0, 0]}
//                   opacity={0.35}
//                 />
//                 <Bar dataKey="submitted" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* Par formulaire */}
//         <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
//           <div className="border-b border-border/60 p-5">
//             <h3 className="font-display text-base font-semibold">Par formulaire</h3>
//             <p className="text-xs text-muted-foreground">
//               {byForm.length} formulaire(s) — filtres appliqués
//             </p>
//           </div>
//           <div className="divide-y divide-border/40">
//             {byForm.length === 0 && (
//               <p className="p-5 text-sm text-muted-foreground">Aucune tâche pour ces filtres.</p>
//             )}
//             {byForm.map((f) => {
//               const pct = f.total ? Math.round((f.submitted / f.total) * 100) : 0;
//               return (
//                 <div key={f.form} className="flex items-center gap-4 p-4">
//                   <div className="min-w-0 flex-1">
//                     <div className="truncate text-sm font-medium">{f.form}</div>
//                     <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
//                       <div
//                         className="h-full rounded-full bg-primary transition-all"
//                         style={{ width: `${pct}%` }}
//                       />
//                     </div>
//                   </div>
//                   <span className="shrink-0 font-mono text-sm font-medium text-muted-foreground">
//                     {f.submitted} of {f.total}
//                   </span>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Award, ClipboardList, ListChecks, Send, Star, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";

import { KpiCard } from "@/components/kpi-card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { useAssignments } from "@/lib/queries/assignments";

import {
  applyFilters,
  emptyFilters,
  dueState,
  progressByForm,
  submissionProgress,
  type TaskFilters,
} from "@/lib/tasks";

import { api, type Evaluation } from "@/lib/api-client";

export const Route = createFileRoute("/supervisor/dashboard")({
  component: SupervisorDashboard,

  head: () => ({
    meta: [
      {
        title: "Tableau de bord — LAS Superviseur",
      },
      {
        name: "description",
        content: "Vue de synthèse des fiches, tâches et évaluation du superviseur.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
});

function getOverallScore(evaluation: Evaluation): number | null {
  const values = [
    evaluation.respectDelais,
    evaluation.qualiteInspections,
    evaluation.qualiteObservations,
    evaluation.suiviAnomalies,
    evaluation.respectProcedures,
    evaluation.reactivite,
    evaluation.autonomie,
  ].filter((value): value is number => typeof value === "number");

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getScoreClass(score: number | null): string {
  if (score === null) {
    return "bg-muted text-muted-foreground";
  }

  if (score >= 4.5) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (score >= 3.5) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }

  if (score >= 2.5) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
}

function SupervisorDashboard() {
  /*
   * ------------------------------------------------------------------
   * FILTRES / TÂCHES
   * ------------------------------------------------------------------
   */

  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);

  const set = (key: keyof TaskFilters, value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
    }));
  };

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
    const map = new Map<
      number,
      {
        submitted: number;
        total: number;
      }
    >();

    for (const t of filtered) {
      const entry = map.get(t.bimester) ?? {
        submitted: 0,
        total: 0,
      };

      entry.total += 1;

      if (t.status === "pending" || t.status === "verified") {
        entry.submitted += 1;
      }

      map.set(t.bimester, entry);
    }

    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bimester, value]) => ({
        bimester: `B${bimester}`,
        ...value,
      }));
  }, [filtered]);

  /*
   * ------------------------------------------------------------------
   * ÉVALUATION DU SUPERVISEUR
   * ------------------------------------------------------------------
   */

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [evaluationLoading, setEvaluationLoading] = useState(true);

  const [evaluationError, setEvaluationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMyEvaluation() {
      try {
        setEvaluationLoading(true);
        setEvaluationError("");

        const data = await api.myEvaluation();

        if (!cancelled) {
          setEvaluation(data);
        }
      } catch (error) {
        console.error("Erreur chargement évaluation :", error);

        if (!cancelled) {
          setEvaluationError(
            error instanceof Error ? error.message : "Impossible de charger votre évaluation.",
          );
        }
      } finally {
        if (!cancelled) {
          setEvaluationLoading(false);
        }
      }
    }

    void loadMyEvaluation();

    return () => {
      cancelled = true;
    };
  }, []);

  const evaluationScore = useMemo(
    () => (evaluation ? getOverallScore(evaluation) : null),
    [evaluation],
  );

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Superviseur"
        title="Tableau de bord"
        subtitle="Synthèse des fiches, tâches et de votre évaluation"
      />

      <div className="space-y-6 p-6 md:p-8">
        {/* ==========================================================
            FILTRES
        ========================================================== */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={filters.form} onValueChange={(v) => set("form", v)}>
            <SelectTrigger className="h-9 bg-background/60">
              <SelectValue placeholder="Formulaire" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Tous les formulaires</SelectItem>

              {forms.map((form) => (
                <SelectItem key={form} value={form}>
                  {form}
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

              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
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

              {[1, 2, 3, 4, 5, 6].map((bimester) => (
                <SelectItem key={bimester} value={String(bimester)}>
                  Bimestre {bimester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ==========================================================
            KPIs
        ========================================================== */}

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

        {/* ==========================================================
            MON ÉVALUATION
        ========================================================== */}

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <h3 className="font-display text-base font-semibold">Mon évaluation</h3>

                  <p className="text-xs text-muted-foreground">Votre dernière évaluation</p>
                </div>
              </div>
            </div>

            {evaluation && (
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/evaluations/$id"
                  params={{
                    id: evaluation.id,
                  }}
                >
                  Voir le détail
                </Link>
              </Button>
            )}
          </div>

          {evaluationLoading && (
            <div className="mt-6 flex min-h-[120px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Chargement de votre évaluation...</p>
            </div>
          )}

          {!evaluationLoading && evaluationError && (
            <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{evaluationError}</p>
            </div>
          )}

          {!evaluationLoading && !evaluationError && !evaluation && (
            <div className="mt-6 rounded-xl border border-dashed border-border/70 p-6 text-center">
              <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />

              <p className="mt-3 font-medium">Aucune évaluation disponible</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Votre évaluation apparaîtra ici lorsqu'elle aura été enregistrée.
              </p>
            </div>
          )}

          {!evaluationLoading && !evaluationError && evaluation && (
            <div className="mt-6 space-y-6">
              {/* Note globale + période */}
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="rounded-xl border border-border/50 bg-background/40 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Note globale
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <Star className="h-7 w-7 fill-current text-amber-500" />

                    <span className="text-3xl font-bold">
                      {evaluationScore !== null ? evaluationScore.toFixed(2) : "—"}
                    </span>

                    <span className="text-sm text-muted-foreground">/ 5</span>
                  </div>

                  <Badge className={`mt-3 border-0 ${getScoreClass(evaluationScore)}`}>
                    {evaluationScore !== null
                      ? evaluationScore >= 4.5
                        ? "Excellent"
                        : evaluationScore >= 3.5
                          ? "Satisfaisant"
                          : evaluationScore >= 2.5
                            ? "À améliorer"
                            : "Insuffisant"
                      : "Non notée"}
                  </Badge>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Année</p>

                      <p className="mt-1 font-medium">{evaluation.year}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Période</p>

                      <p className="mt-1 font-medium">Bimestre {evaluation.bimonthlyPeriod}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Groupe</p>

                      <p className="mt-1 font-medium">{evaluation.group?.name ?? "Tous groupes"}</p>
                    </div>
                  </div>

                  {evaluation.createdBy && (
                    <div className="mt-5 border-t border-border/50 pt-4">
                      <p className="text-xs text-muted-foreground">Évaluation réalisée par</p>

                      <p className="mt-1 text-sm font-medium">{evaluation.createdBy.displayName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Critères */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Critères d'évaluation</h4>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Respect des délais",
                      value: evaluation.respectDelais,
                    },
                    {
                      label: "Qualité des inspections",
                      value: evaluation.qualiteInspections,
                    },
                    {
                      label: "Qualité des observations",
                      value: evaluation.qualiteObservations,
                    },
                    {
                      label: "Suivi des anomalies",
                      value: evaluation.suiviAnomalies,
                    },
                    {
                      label: "Respect des procédures",
                      value: evaluation.respectProcedures,
                    },
                    {
                      label: "Réactivité",
                      value: evaluation.reactivite,
                    },
                    {
                      label: "Autonomie",
                      value: evaluation.autonomie,
                    },
                  ].map((criterion) => (
                    <div
                      key={criterion.label}
                      className="rounded-xl border border-border/50 bg-background/40 p-4"
                    >
                      <p className="text-xs text-muted-foreground">{criterion.label}</p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg font-bold">{criterion.value ?? "—"}</span>

                        <span className="text-xs text-muted-foreground">/ 5</span>
                      </div>

                      {criterion.value !== null && criterion.value !== undefined && (
                        <div className="mt-2 flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= criterion.value!
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/25"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Observations */}
              {(evaluation.strengths ||
                evaluation.weaknesses ||
                evaluation.recommendations ||
                evaluation.comment) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {evaluation.strengths && (
                    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                      <p className="text-sm font-semibold">Points forts</p>

                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {evaluation.strengths}
                      </p>
                    </div>
                  )}

                  {evaluation.weaknesses && (
                    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                      <p className="text-sm font-semibold">Points à améliorer</p>

                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {evaluation.weaknesses}
                      </p>
                    </div>
                  )}

                  {evaluation.recommendations && (
                    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                      <p className="text-sm font-semibold">Recommandations</p>

                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {evaluation.recommendations}
                      </p>
                    </div>
                  )}

                  {evaluation.comment && (
                    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                      <p className="text-sm font-semibold">Commentaire</p>

                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {evaluation.comment}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==========================================================
            PAR PÉRIODE
        ========================================================== */}

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <h3 className="font-display text-base font-semibold">Par période (bimestre)</h3>

          <p className="text-xs text-muted-foreground">Soumises vs total, filtres appliqués</p>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byBimester}
                margin={{
                  left: -20,
                  right: 8,
                  top: 8,
                  bottom: 0,
                }}
              >
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

        {/* ==========================================================
            PAR FORMULAIRE
        ========================================================== */}

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

            {byForm.map((form) => {
              const pct = form.total ? Math.round((form.submitted / form.total) * 100) : 0;

              return (
                <div key={form.form} className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{form.form}</div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>

                  <span className="shrink-0 font-mono text-sm font-medium text-muted-foreground">
                    {form.submitted} of {form.total}
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
