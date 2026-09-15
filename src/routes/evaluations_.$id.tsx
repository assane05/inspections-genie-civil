import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageSquareText,
  Save,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, type Evaluation } from "@/lib/api-client";

export const Route = createFileRoute("/evaluations_/$id")({
  component: EvaluationDetailPage,
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

const CRITERIA: {
  key: ScoreKey;
  label: string;
}[] = [
  {
    key: "respectDelais",
    label: "Respect des délais",
  },
  {
    key: "qualiteInspections",
    label: "Qualité des inspections",
  },
  {
    key: "qualiteObservations",
    label: "Qualité des observations",
  },
  {
    key: "suiviAnomalies",
    label: "Suivi des anomalies",
  },
  {
    key: "respectProcedures",
    label: "Respect des procédures",
  },
  {
    key: "reactivite",
    label: "Réactivité",
  },
  {
    key: "autonomie",
    label: "Autonomie",
  },
];

function EvaluationDetailPage() {
  const { id } = Route.useParams();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [scores, setScores] = useState<Scores>({
    respectDelais: null,
    qualiteInspections: null,
    qualiteObservations: null,
    suiviAnomalies: null,
    respectProcedures: null,
    reactivite: null,
    autonomie: null,
  });

  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [comment, setComment] = useState("");

  /*
   * ------------------------------------------------------------
   * Chargement
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await api.evaluation(id);

        if (cancelled) return;

        setEvaluation(data);
        fillForm(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossible de charger l'évaluation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function fillForm(data: Evaluation) {
    setScores({
      respectDelais: data.respectDelais,
      qualiteInspections: data.qualiteInspections,
      qualiteObservations: data.qualiteObservations,
      suiviAnomalies: data.suiviAnomalies,
      respectProcedures: data.respectProcedures,
      reactivite: data.reactivite,
      autonomie: data.autonomie,
    });

    setStrengths(data.strengths ?? "");
    setWeaknesses(data.weaknesses ?? "");
    setRecommendations(data.recommendations ?? "");
    setComment(data.comment ?? "");
  }

  /*
   * ------------------------------------------------------------
   * Note globale
   * ------------------------------------------------------------
   */

  const overallScore = useMemo(() => {
    const values = Object.values(scores).filter((value): value is number => value !== null);

    if (!values.length) {
      return null;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }, [scores]);

  /*
   * ------------------------------------------------------------
   * Modifier une note
   * ------------------------------------------------------------
   */

  function updateScore(key: ScoreKey, value: number) {
    setScores((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  }

  /*
   * ------------------------------------------------------------
   * Sauvegarde
   * ------------------------------------------------------------
   */

  async function saveChanges() {
    if (!evaluation) return;

    const allScoresPresent = CRITERIA.every(({ key }) => scores[key] !== null);

    if (!allScoresPresent) {
      setError("Tous les critères doivent avoir une note avant l'enregistrement.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated = await api.updateEvaluation(evaluation.id, {
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

      setEvaluation(updated);
      fillForm(updated);

      setEditing(false);

      setSuccess("L'évaluation a été modifiée avec succès.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier l'évaluation.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * Annulation
   * ------------------------------------------------------------
   */

  function cancelEditing() {
    if (evaluation) {
      fillForm(evaluation);
    }

    setEditing(false);
    setError("");
  }

  /*
   * ------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="pb-10">
        <PageHeader eyebrow="Évaluation" title="Détail de l'évaluation" subtitle="Chargement..." />

        <div className="flex min-h-96 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement de l'évaluation...
          </div>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * Erreur / introuvable
   * ------------------------------------------------------------
   */

  if (!evaluation) {
    return (
      <div className="pb-10">
        <PageHeader
          eyebrow="Évaluation"
          title="Évaluation introuvable"
          subtitle="Cette évaluation n'existe pas ou n'est plus accessible."
        />

        <div className="mx-auto max-w-4xl p-6 md:p-8">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
            {error || "Évaluation introuvable."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Évaluation"
        title={evaluation.supervisor?.displayName ?? "Évaluation du superviseur"}
        subtitle={`Évaluation ${evaluation.year} — Bimestre ${evaluation.bimonthlyPeriod}`}
      />

      <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
        {/* =====================================================
            Actions
        ====================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/evaluations-list">
            <Button type="button" variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour aux évaluations
            </Button>
          </Link>

          {!editing ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>
                Annuler
              </Button>

              <Button type="button" onClick={saveChanges} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* =====================================================
            Messages
        ====================================================== */}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* =====================================================
            Informations
        ====================================================== */}

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <UserRound className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-semibold">{evaluation.supervisor?.displayName}</h2>

                {evaluation.supervisor?.username && (
                  <p className="text-sm text-muted-foreground">@{evaluation.supervisor.username}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    {evaluation.year}
                  </Badge>

                  <Badge variant="outline">Bimestre {evaluation.bimonthlyPeriod}</Badge>

                  {evaluation.group && <Badge variant="outline">{evaluation.group.name}</Badge>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-primary/10 px-7 py-5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Note globale
              </div>

              <div className="mt-1 flex items-center justify-center gap-2">
                <Star className="h-5 w-5 fill-current text-primary" />

                <span className="text-3xl font-bold text-primary">
                  {overallScore !== null ? overallScore.toFixed(2) : "—"}
                </span>

                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            Critères
        ====================================================== */}

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <div className="mb-6">
            <h2 className="font-semibold">Critères d'évaluation</h2>

            <p className="text-sm text-muted-foreground">
              {editing
                ? "Modifiez les notes attribuées au superviseur."
                : "Détail des critères évalués."}
            </p>
          </div>

          <div className="space-y-3">
            {CRITERIA.map((criterion, index) => (
              <div
                key={criterion.key}
                className="flex flex-col gap-4 rounded-xl border border-border/50 bg-background/40 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                    {index + 1}
                  </div>

                  <span className="text-sm font-medium">{criterion.label}</span>
                </div>

                {editing ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const selected = scores[criterion.key] === score;

                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => updateScore(criterion.key, score)}
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                          ].join(" ")}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <ScoreDisplay value={scores[criterion.key]} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            Observations
        ====================================================== */}

        <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <div className="mb-6 flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />

            <div>
              <h2 className="font-semibold">Observations</h2>

              <p className="text-sm text-muted-foreground">
                Appréciation qualitative du superviseur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {editing ? (
              <>
                <EditableObservation
                  label="Points forts"
                  value={strengths}
                  onChange={setStrengths}
                  placeholder="Points forts du superviseur..."
                />

                <EditableObservation
                  label="Points à améliorer"
                  value={weaknesses}
                  onChange={setWeaknesses}
                  placeholder="Points à améliorer..."
                />

                <EditableObservation
                  label="Recommandations"
                  value={recommendations}
                  onChange={setRecommendations}
                  placeholder="Recommandations..."
                />

                <EditableObservation
                  label="Commentaire général"
                  value={comment}
                  onChange={setComment}
                  placeholder="Commentaire général..."
                />
              </>
            ) : (
              <>
                <Observation title="Points forts" value={evaluation.strengths} />

                <Observation title="Points à améliorer" value={evaluation.weaknesses} />

                <Observation title="Recommandations" value={evaluation.recommendations} />

                <Observation title="Commentaire général" value={evaluation.comment} />
              </>
            )}
          </div>
        </section>

        {/* =====================================================
            Informations finales
        ====================================================== */}

        <section className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 md:flex-row md:justify-between">
            <span>
              Créée le{" "}
              <strong className="text-foreground">{formatDate(evaluation.createdAt)}</strong>
            </span>

            {evaluation.createdBy && (
              <span>
                Évaluée par{" "}
                <strong className="text-foreground">{evaluation.createdBy.displayName}</strong>
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * Score
 * ============================================================
 */

function ScoreDisplay({ value }: { value: number | null }) {
  if (value === null) {
    return <Badge variant="outline">Non noté</Badge>;
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className={["h-2.5 w-2.5 rounded-full", item <= value ? "bg-primary" : "bg-muted"].join(
            " ",
          )}
        />
      ))}

      <span className="ml-2 text-sm font-semibold">{value}/5</span>
    </div>
  );
}

/*
 * ============================================================
 * Observation lecture
 * ============================================================
 */

function Observation({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6">
        {value?.trim() || (
          <span className="text-muted-foreground">Aucune observation renseignée.</span>
        )}
      </p>
    </div>
  );
}

/*
 * ============================================================
 * Observation édition
 * ============================================================
 */

function EditableObservation({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-28 resize-y bg-background/60"
      />
    </div>
  );
}

/*
 * ============================================================
 * Date
 * ============================================================
 */

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
