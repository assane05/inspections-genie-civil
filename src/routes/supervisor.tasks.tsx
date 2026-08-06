import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Building2, Clock, Download, Play, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { loadDraft } from "@/lib/offline-queue";
import { getTaskOverride } from "@/lib/task-status";
import {
  applyFilters,
  daysUntil,
  downloadCsv,
  dueState,
  emptyFilters,
  tasksForGroups,
  tasksToCsv,
  type TaskFilters,
} from "@/lib/tasks";
import { StatusBadge } from "@/routes/dashboard";

export const Route = createFileRoute("/supervisor/tasks")({
  component: SupervisorTasks,
  head: () => ({
    meta: [
      { title: "Mes tâches — LAS Superviseur" },
      {
        name: "description",
        content: "Tâches d'inspection assignées au superviseur, filtrables et exportables.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PAGE_SIZE = 8;

function DueBadge({ iso, done }: { iso: string; done: boolean }) {
  if (done) return null;
  const d = daysUntil(iso);
  if (d < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
        <AlertTriangle className="h-3 w-3" />
        En retard de {Math.abs(d)} j
      </span>
    );
  if (d <= 3)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
        <Clock className="h-3 w-3" />
        {d === 0 ? "Échéance aujourd'hui" : `Échéance dans ${d} j`}
      </span>
    );
  return null;
}

function SupervisorTasks() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const [page, setPage] = useState(1);

  const groups = user?.groups ?? [];
  const scoped = useMemo(() => tasksForGroups(groups), [groups.join("|")]);
  const filtered = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const set = (key: keyof TaskFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const forms = useMemo(() => [...new Set(scoped.map((r) => r.form))].sort(), [scoped]);
  const years = useMemo(
    () => [...new Set(scoped.map((r) => r.year))].sort((a, b) => b - a),
    [scoped],
  );
  const weeks = useMemo(
    () => [...new Set(scoped.map((r) => r.week))].sort((a, b) => a - b),
    [scoped],
  );

  const overdueCount = filtered.filter((r) => dueState(r) === "overdue").length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.tasks")}
        title={t("tasks.title")}
        subtitle={`Vos inspections à réaliser — ${groups.join(", ") || "aucun groupe"}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadCsv(
                `taches-${new Date().toISOString().slice(0, 10)}.csv`,
                tasksToCsv(filtered),
              )
            }
          >
            <Download className="h-4 w-4" />
            Exporter CSV ({filtered.length})
          </Button>
        }
      />

      <div className="p-6 md:p-8">
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => set("q", e.target.value)}
                placeholder={t("topbar.search")}
                className="h-9 bg-background/60 pl-9"
              />
            </div>

            <Select value={filters.form} onValueChange={(v) => set("form", v)}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder={t("filters.form")} />
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

            <Select value={filters.week} onValueChange={(v) => set("week", v)}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Semaine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les semaines</SelectItem>
                {weeks.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Semaine {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder={t("table.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>
                <SelectItem value="not_submitted">Non soumis</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="pending">En attente de vérification</SelectItem>
                <SelectItem value="verified">Vérifié</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              className="h-9 gap-2 md:col-span-1"
              onClick={() => {
                setFilters(emptyFilters);
                setPage(1);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {filtered.length} tâche(s) — {overdueCount} en retard. L'export CSV reprend exactement
            ces filtres.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-5">{t("table.form")}</TableHead>
                <TableHead>{t("table.due")}</TableHead>
                <TableHead>Zone / {t("table.notes")}</TableHead>
                <TableHead>{t("table.group")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="pr-5 text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const override = getTaskOverride(r.id);
                const state = dueState(r);
                const draft =
                  typeof window !== "undefined" &&
                  !!loadDraft(`${r.kind === "batiment" ? "building" : "task"}-${r.id}`);
                return (
                  <TableRow
                    key={r.id}
                    className={
                      state === "overdue"
                        ? "border-l-2 border-l-destructive border-b-border/40 bg-destructive/5"
                        : state === "due_soon"
                          ? "border-l-2 border-l-warning border-b-border/40 bg-warning/5"
                          : "border-border/40"
                    }
                  >
                    <TableCell className="pl-5 font-medium">
                      <div className="flex items-center gap-2">
                        {r.form}
                        {r.kind === "batiment" && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            <Building2 className="h-3 w-3" /> Bâtiment
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        S{r.week} · B{r.bimester} · {r.year}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{r.dueDate}</div>
                      <div className="mt-1">
                        <DueBadge
                          iso={r.dueISO}
                          done={r.status === "verified" || r.status === "pending"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.zone}</div>
                      <div className="text-muted-foreground">{r.notes}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {r.group}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                      {override && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Soumis par {override.submittedBy} ·{" "}
                          {new Date(override.submittedAt).toLocaleString("fr-FR")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button
                        size="sm"
                        className="h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() =>
                          navigate(
                            r.kind === "batiment"
                              ? { to: "/supervisor/building/$taskId", params: { taskId: r.id } }
                              : { to: "/supervisor/task/$taskId", params: { taskId: r.id } },
                          )
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        {draft ? "Reprendre" : "Commencer"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune tâche ne correspond aux filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {current} / {pageCount} — {filtered.length} résultat(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
