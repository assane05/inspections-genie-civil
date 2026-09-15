import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Loader2,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { api, type EvaluationSummary, type EvaluationSupervisor } from "@/lib/api-client";

export const Route = createFileRoute("/evaluation")({
  component: Evaluation,
  head: () => ({
    meta: [
      {
        title: "Évaluation des superviseurs — LAS Inspections",
      },
      {
        name: "description",
        content: "Évaluation périodique des performances des superviseurs.",
      },
    ],
  }),
});

type ScoreKey =
  | "respectDelais"
  | "qualiteInspections"
  | "qualiteObservations"
  | "suiviAnomalies"
  | "respectProcedures"
  | "reactivite"
  | "autonomie";

type Scores = Record<ScoreKey, number | null>;

const SCORE_LABELS: Record<ScoreKey, string> = {
  respectDelais: "Respect des délais",
  qualiteInspections: "Qualité des inspections",
  qualiteObservations: "Qualité des observations",
  suiviAnomalies: "Suivi des anomalies",
  respectProcedures: "Respect des procédures",
  reactivite: "Réactivité",
  autonomie: "Autonomie",
};

const SCORE_KEYS: ScoreKey[] = [
  "respectDelais",
  "qualiteInspections",
  "qualiteObservations",
  "suiviAnomalies",
  "respectProcedures",
  "reactivite",
  "autonomie",
];

const EMPTY_SCORES: Scores = {
  respectDelais: null,
  qualiteInspections: null,
  qualiteObservations: null,
  suiviAnomalies: null,
  respectProcedures: null,
  reactivite: null,
  autonomie: null,
};

function Evaluation() {
  const { t } = useI18n();

  const currentYear = new Date().getFullYear();

  const [supervisors, setSupervisors] = useState<EvaluationSupervisor[]>([]);
  const [supervisorId, setSupervisorId] = useState("");
  const [year, setYear] = useState(String(currentYear));
  const [bimester, setBimester] = useState("1");
  const [groupId, setGroupId] = useState("all");

  const [summary, setSummary] = useState<EvaluationSummary | null>(null);

  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);

  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [comment, setComment] = useState("");

  const [loadingSupervisors, setLoadingSupervisors] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ------------------------------------------------------------
   * Chargement des superviseurs
   * ------------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function loadSupervisors() {
      try {
        setLoadingSupervisors(true);
        setError("");

        const data = await api.evaluationSupervisors();

        if (cancelled) return;

        setSupervisors(data);

        if (data.length > 0) {
          setSupervisorId(data[0].id);
        }
      } catch (err) {
        if (cancelled) return;

        setError(err instanceof Error ? err.message : "Impossible de charger les superviseurs.");
      } finally {
        if (!cancelled) {
          setLoadingSupervisors(false);
        }
      }
    }

    loadSupervisors();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * Groupes du superviseur sélectionné
   * ------------------------------------------------------------
   */
  const selectedSupervisor = useMemo(
    () => supervisors.find((item) => item.id === supervisorId) ?? null,
    [supervisors, supervisorId],
  );

  const supervisorGroups = selectedSupervisor?.groups ?? [];

  useEffect(() => {
    if (!selectedSupervisor) {
      setGroupId("all");
      return;
    }

    if (groupId !== "all" && !supervisorGroups.some((group) => group.id === groupId)) {
      setGroupId("all");
    }
  }, [selectedSupervisor, supervisorGroups, groupId]);

  /*
   * ------------------------------------------------------------
   * Chargement des statistiques réelles
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!supervisorId || !year || !bimester) {
      setSummary(null);
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setError("");
        setSuccess("");

        const data = await api.evaluationSummary({
          supervisorId,
          year: Number(year),
          bimester: Number(bimester),
          groupId: groupId !== "all" ? groupId : undefined,
        });

        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null);

          setError(err instanceof Error ? err.message : "Impossible de calculer les statistiques.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [supervisorId, year, bimester, groupId]);

  /*
   * ------------------------------------------------------------
   * Note globale
   * ------------------------------------------------------------
   */
  const selectedScores = SCORE_KEYS.map((key) => scores[key]).filter(
    (value): value is number => value !== null,
  );

  const overallScore =
    selectedScores.length > 0
      ? selectedScores.reduce((total, value) => total + value, 0) / selectedScores.length
      : null;

  const allScoresSelected = selectedScores.length === SCORE_KEYS.length;

  /*
   * ------------------------------------------------------------
   * Années disponibles
   * ------------------------------------------------------------
   */
  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

  /*
   * ------------------------------------------------------------
   * Score
   * ------------------------------------------------------------
   */
  function setScore(key: ScoreKey, value: number) {
    setScores((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  }

  /*
   * ------------------------------------------------------------
   * Enregistrement
   * ------------------------------------------------------------
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!supervisorId) {
      setError("Veuillez sélectionner un superviseur.");
      return;
    }

    if (!allScoresSelected) {
      setError("Veuillez attribuer une note aux 7 critères avant d'enregistrer.");
      return;
    }

    try {
      setSaving(true);

      await api.createEvaluation({
        supervisorId,
        year: Number(year),
        bimonthlyPeriod: Number(bimester),
        groupId: groupId !== "all" ? groupId : null,

        respectDelais: scores.respectDelais,
        qualiteInspections: scores.qualiteInspections,
        qualiteObservations: scores.qualiteObservations,
        suiviAnomalies: scores.suiviAnomalies,
        respectProcedures: scores.respectProcedures,
        reactivite: scores.reactivite,
        autonomie: scores.autonomie,

        strengths: strengths.trim() || null,
        weaknesses: weaknesses.trim() || null,
        recommendations: recommendations.trim() || null,
        comment: comment.trim() || null,
      });

      setSuccess("L'évaluation du superviseur a été enregistrée avec succès.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'évaluation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.evaluation")}
        title="Évaluation des superviseurs"
        subtitle="Évaluez les performances d'un superviseur à partir des données réelles des inspections."
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
        {/* =====================================================
            Sélection de la période
        ====================================================== */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">Superviseur à évaluer</h2>
              <p className="text-sm text-muted-foreground">
                Sélectionnez la personne et la période concernée.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Superviseur */}
            <div className="lg:col-span-2">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Superviseur *
              </Label>

              <select
                value={supervisorId}
                onChange={(event) => {
                  setSupervisorId(event.target.value);
                  setScores(EMPTY_SCORES);
                  setStrengths("");
                  setWeaknesses("");
                  setRecommendations("");
                  setComment("");
                  setSuccess("");
                }}
                disabled={loadingSupervisors}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loadingSupervisors ? "Chargement..." : "Sélectionner un superviseur"}
                </option>

                {supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.displayName}
                    {supervisor.username ? ` — ${supervisor.username}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Année */}
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Année *
              </Label>

              <select
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setSuccess("");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Bimestre */}
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Bimestre *
              </Label>

              <select
                value={bimester}
                onChange={(event) => {
                  setBimester(event.target.value);
                  setSuccess("");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <option key={item} value={item}>
                    Bimestre {item}
                  </option>
                ))}
              </select>
            </div>

            {/* Groupe */}
            <div className="lg:col-span-2">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Groupe / secteur
              </Label>

              <select
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setSuccess("");
                }}
                disabled={!selectedSupervisor}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">Tous les groupes</option>

                {supervisorGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* =====================================================
            Messages
        ====================================================== */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {/* =====================================================
            Statistiques automatiques
        ====================================================== */}
        {loadingSummary ? (
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card/60 p-12">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Calcul des performances du superviseur...
            </div>
          </div>
        ) : summary ? (
          <>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Performance automatique</h2>

                  <p className="text-sm text-muted-foreground">
                    Données calculées à partir des inspections réelles du superviseur.
                  </p>
                </div>

                <Badge variant="outline">
                  {summary.period.year} — Bimestre {summary.period.bimester}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PerformanceCard
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  label="Missions assignées"
                  value={summary.performance.assigned}
                  detail={`${summary.performance.completed} réalisées`}
                />

                <PerformanceCard
                  icon={<FileCheck2 className="h-5 w-5" />}
                  label="Inspections"
                  value={summary.performance.totalInspections}
                  detail={`${summary.performance.verified} vérifiées`}
                />

                <PerformanceCard
                  icon={<Target className="h-5 w-5" />}
                  label="Taux de réalisation"
                  value={`${summary.performance.completionRate}%`}
                  detail={`${summary.performance.submitted} soumises`}
                />

                <PerformanceCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="Taux de conformité"
                  value={`${summary.performance.complianceRate}%`}
                  detail={`${summary.findings.compliant} constats conformes`}
                />
              </div>
            </section>

            {/* =================================================
                Deuxième ligne KPI
            ================================================== */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MiniStat
                label="Taux de vérification"
                value={`${summary.performance.verificationRate}%`}
                icon={<ShieldCheck className="h-4 w-4" />}
              />

              <MiniStat
                label="Inspections rejetées"
                value={summary.performance.rejected}
                icon={<AlertCircle className="h-4 w-4" />}
              />

              <MiniStat
                label="Missions en retard"
                value={summary.performance.overdue}
                icon={<Clock3 className="h-4 w-4" />}
              />
            </section>

            {/* =================================================
                Constats
            ================================================== */}
            <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
              <div className="mb-5">
                <h2 className="font-semibold">Résultats des constats</h2>
                <p className="text-sm text-muted-foreground">
                  Répartition des constats issus des inspections vérifiées.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <FindingCard label="RAS" value={summary.findings.ras} description="Conforme" />

                <FindingCard label="YES" value={summary.findings.yes} description="Conforme" />

                <FindingCard label="NA" value={summary.findings.na} description="Acceptable" />

                <FindingCard
                  label="MINOR"
                  value={summary.findings.minor}
                  description="Non conforme"
                />

                <FindingCard
                  label="MAJOR"
                  value={summary.findings.major}
                  description="Non conforme"
                />

                <FindingCard
                  label="Non inspecté"
                  value={summary.findings.nonInspected}
                  description="Exclu du calcul"
                />
              </div>
            </section>
          </>
        ) : supervisorId ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucune donnée de performance disponible pour cette sélection.
          </div>
        ) : null}

        {/* =====================================================
            Critères d'évaluation
        ====================================================== */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-sm">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">Évaluation du superviseur</h2>
              <p className="text-sm text-muted-foreground">
                Attribuez une note de 1 à 5 pour chaque critère.
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-background/70 px-5 py-3 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Note globale
              </div>

              <div className="text-2xl font-bold text-primary">
                {overallScore !== null ? `${overallScore.toFixed(2)} / 5` : "—"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {SCORE_KEYS.map((key, index) => (
              <ScoreRow
                key={key}
                index={index + 1}
                label={SCORE_LABELS[key]}
                value={scores[key]}
                onChange={(value) => setScore(key, value)}
              />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground">
            <strong>Échelle :</strong> 1 = Insuffisant · 2 = À améliorer · 3 = Satisfaisant · 4 =
            Très satisfaisant · 5 = Excellent
          </div>
        </section>

        {/* =====================================================
            Évaluation qualitative
        ====================================================== */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="font-semibold">Évaluation qualitative</h2>
            <p className="text-sm text-muted-foreground">
              Complétez les observations générales concernant le superviseur.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label className="mb-2 block">Points forts</Label>

              <Textarea
                value={strengths}
                onChange={(event) => setStrengths(event.target.value)}
                placeholder="Ex. bonne organisation, rigueur dans les contrôles..."
                className="min-h-28 resize-y bg-background/60"
              />
            </div>

            <div>
              <Label className="mb-2 block">Points à améliorer</Label>

              <Textarea
                value={weaknesses}
                onChange={(event) => setWeaknesses(event.target.value)}
                placeholder="Ex. amélioration du suivi des anomalies..."
                className="min-h-28 resize-y bg-background/60"
              />
            </div>

            <div>
              <Label className="mb-2 block">Recommandations</Label>

              <Textarea
                value={recommendations}
                onChange={(event) => setRecommendations(event.target.value)}
                placeholder="Actions ou recommandations pour la prochaine période..."
                className="min-h-28 resize-y bg-background/60"
              />
            </div>

            <div>
              <Label className="mb-2 block">Commentaire général</Label>

              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Appréciation générale du superviseur..."
                className="min-h-28 resize-y bg-background/60"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            Enregistrement
        ====================================================== */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Enregistrer l'évaluation</p>

            <p className="text-sm text-muted-foreground">
              La note globale est calculée automatiquement à partir des 7 critères.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving || loadingSummary || !supervisorId}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer l'évaluation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

/*
 * ============================================================
 * Composants UI
 * ============================================================
 */

function PerformanceCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div>

        <span className="text-xs uppercase tracking-wider text-muted-foreground">KPI</span>
      </div>

      <div className="text-2xl font-bold tracking-tight">{value}</div>

      <div className="mt-1 text-sm font-medium">{label}</div>

      <div className="mt-2 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>

        <div className="mt-1 text-xl font-semibold">{value}</div>
      </div>

      <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
    </div>
  );
}

function FindingCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold">{value}</div>

      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function ScoreRow({
  index,
  label,
  value,
  onChange,
}: {
  index: number;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
          {index}
        </div>

        <span className="text-sm font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score;

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              aria-label={`Attribuer la note ${score} sur 5`}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
              ].join(" ")}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
