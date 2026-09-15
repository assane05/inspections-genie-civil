import React, { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Search,
  Star,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { api, type Evaluation } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/evaluations-list")({
  component: EvaluationsPage,
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

  const total = values.reduce((sum, value) => sum + value, 0);

  return total / values.length;
}

function getScoreBadgeClass(score: number | null): string {
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

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function EvaluationsPage() {
  const { user } = useAuth();

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [bimesterFilter, setBimesterFilter] = useState("all");

  const isAdmin = user?.role === "administrateur";

  useEffect(() => {
    let cancelled = false;

    async function loadEvaluations() {
      try {
        setLoading(true);
        setError("");

        const data = await api.evaluations();

        if (!cancelled) {
          setEvaluations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Erreur chargement évaluations :", err);

          setError(err instanceof Error ? err.message : "Impossible de charger les évaluations.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvaluations();

    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => {
    return Array.from(new Set(evaluations.map((evaluation) => evaluation.year))).sort(
      (a, b) => b - a,
    );
  }, [evaluations]);

  const bimesters = useMemo(() => {
    return Array.from(new Set(evaluations.map((evaluation) => evaluation.bimonthlyPeriod))).sort(
      (a, b) => a - b,
    );
  }, [evaluations]);

  const filteredEvaluations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return evaluations
      .filter((evaluation) => {
        if (yearFilter !== "all" && String(evaluation.year) !== yearFilter) {
          return false;
        }

        if (bimesterFilter !== "all" && String(evaluation.bimonthlyPeriod) !== bimesterFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const supervisorName = evaluation.supervisor?.displayName ?? "";

        const supervisorUsername = evaluation.supervisor?.username ?? "";

        const groupName = evaluation.group?.name ?? "";

        return [
          supervisorName,
          supervisorUsername,
          groupName,
          String(evaluation.year),
          `bimestre ${evaluation.bimonthlyPeriod}`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();

        return dateB - dateA;
      });
  }, [evaluations, search, yearFilter, bimesterFilter]);

  const stats = useMemo(() => {
    const scores = evaluations
      .map(getOverallScore)
      .filter((score): score is number => score !== null);

    const average =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;

    const excellent = scores.filter((score) => score >= 4.5).length;
    const satisfactory = scores.filter((score) => score >= 3.5 && score < 4.5).length;
    const needsImprovement = scores.filter((score) => score < 3.5).length;

    return {
      total: evaluations.length,
      average,
      excellent,
      satisfactory,
      needsImprovement,
    };
  }, [evaluations]);

  return (
    <div className="space-y-6">
      <PageHeader title="Évaluations des superviseurs" />

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {filteredEvaluations.length} évaluation
          {filteredEvaluations.length > 1 ? "s" : ""} affichée
          {filteredEvaluations.length > 1 ? "s" : ""}
        </div>

        {isAdmin && (
          <Button asChild>
            <Link to="/evaluation">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Nouvelle évaluation
            </Link>
          </Button>
        )}
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total évaluations
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>

            <p className="mt-1 text-xs text-muted-foreground">Évaluations enregistrées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Moyenne globale
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />

              <span className="text-2xl font-bold">
                {stats.average !== null ? `${stats.average.toFixed(2)} / 5` : "—"}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">Sur les évaluations notées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Très satisfaisant
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.excellent}</div>

            <p className="mt-1 text-xs text-muted-foreground">Score ≥ 4,5 / 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">À améliorer</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.needsImprovement}</div>

            <p className="mt-1 text-xs text-muted-foreground">Score inférieur à 3,5 / 5</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un superviseur ou un groupe..."
                className="pl-9"
              />
            </div>

            {/* Année */}
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Toutes les années</option>

              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Bimestre */}
            <select
              value={bimesterFilter}
              onChange={(event) => setBimesterFilter(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Tous les bimestres</option>

              {bimesters.map((bimester) => (
                <option key={bimester} value={bimester}>
                  Bimestre {bimester}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Erreur */}
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="font-medium text-destructive">Impossible de charger les évaluations</p>

            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{error}</p>

            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chargement */}
      {loading && (
        <Card>
          <CardContent className="flex min-h-[280px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />

              <p className="text-sm">Chargement des évaluations...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      {!loading && !error && (
        <>
          {filteredEvaluations.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/50" />

                <h3 className="mt-4 font-semibold">Aucune évaluation trouvée</h3>

                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Aucune évaluation ne correspond aux critères de recherche sélectionnés.
                </p>

                {(search || yearFilter !== "all" || bimesterFilter !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearch("");
                      setYearFilter("all");
                      setBimesterFilter("all");
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEvaluations.map((evaluation) => {
                const score = getOverallScore(evaluation);

                return (
                  <Link
                    key={evaluation.id}
                    to="/evaluations/$id"
                    params={{
                      id: evaluation.id,
                    }}
                    className={[
                      "group block rounded-xl border p-4",
                      "text-left transition-all",
                      "border-border/50 bg-background/40",
                      "hover:border-primary/40 hover:bg-primary/5",
                      "hover:shadow-sm",
                    ].join(" ")}
                  >
                    {/* En-tête */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <UserRound className="h-4 w-4 text-primary" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {evaluation.supervisor?.displayName ?? "Superviseur"}
                            </p>

                            {evaluation.supervisor?.username && (
                              <p className="truncate text-xs text-muted-foreground">
                                {evaluation.supervisor.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    {/* Informations */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {evaluation.year}
                      </span>

                      <span>•</span>

                      <span>Bimestre {evaluation.bimonthlyPeriod}</span>

                      {evaluation.group && (
                        <>
                          <span>•</span>

                          <span className="truncate">{evaluation.group.name}</span>
                        </>
                      )}
                    </div>

                    {/* Score */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Badge className={`border-0 ${getScoreBadgeClass(score)}`}>
                        <Star className="mr-1 h-3 w-3" />

                        {score !== null ? `${score.toFixed(2)} / 5` : "Non notée"}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(evaluation.createdAt)}
                      </span>
                    </div>

                    {/* Aperçu qualitatif */}
                    {(evaluation.strengths || evaluation.weaknesses) && (
                      <div className="mt-4 space-y-2 border-t pt-3">
                        {evaluation.strengths && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Points forts :</span>{" "}
                            {evaluation.strengths}
                          </p>
                        )}

                        {evaluation.weaknesses && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Points à améliorer :
                            </span>{" "}
                            {evaluation.weaknesses}
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
