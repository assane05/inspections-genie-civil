import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Search, Trash2, Play, Plus } from "lucide-react";
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
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useDeleteTask, useTasks } from "@/lib/queries/tasks";
import { applyFilters, emptyFilters, type TaskFilters } from "@/lib/tasks";
import { StatusBadge } from "@/routes/dashboard";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: "Tâches — LAS Inspections" },
      { name: "description", content: "Suivi des tâches d'inspection assignées." },
    ],
  }),
});

function TasksPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<TaskFilters>(emptyFilters);
  const set = (key: keyof TaskFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  // Même TaskFilters/applyFilters que la liste superviseur et le tableau de bord —
  // garantit des filtres cohérents partout (cf. AC "Assignation des tâches").
  const { data: all = [], isLoading, isError } = useTasks();
  const forms = useMemo(() => [...new Set(all.map((t) => t.form))].sort(), [all]);
  const groups = useMemo(() => [...new Set(all.map((t) => t.group))].sort(), [all]);
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);

  const deleteTask = useDeleteTask();
  const handleDelete = (id: string) => {
    deleteTask.mutate(id, {
      onSuccess: () => toast.success("Tâche supprimée"),
      onError: () => toast.error("Suppression impossible", { description: "Réessayez." }),
    });
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.tasks")}
        title={t("tasks.title")}
        subtitle="Tâches assignées aux équipes de supervision"
        actions={
          <Button
            asChild
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/tasks/new">
              <Plus className="h-4 w-4" />
              {t("action.new_task")}
            </Link>
          </Button>
        }
      />

      <div className="p-6 md:p-8">
        <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative">
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
            <Select value={filters.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="not_submitted">Non soumis</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="pending">En attente de vérification</SelectItem>
                <SelectItem value="verified">Vérifié</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.group} onValueChange={(v) => set("group", v)}>
              <SelectTrigger className="h-9 bg-background/60">
                <SelectValue placeholder="Groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-5">{t("table.form")}</TableHead>
                <TableHead>{t("table.due")}</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>{t("table.notes")}</TableHead>
                <TableHead>{t("table.group")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="pr-5 text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement des tâches…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                    Impossible de charger les tâches. Vérifiez votre connexion.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune tâche pour ces filtres.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id} className="border-border/40">
                  <TableCell className="pl-5 font-medium">{r.form}</TableCell>
                  <TableCell className="font-mono text-sm">{r.dueDate}</TableCell>
                  <TableCell className="text-sm">{r.zone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {r.group}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-primary hover:bg-primary/10"
                        disabled
                      >
                        <Play className="h-3.5 w-3.5" /> {t("action.start")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                        disabled={deleteTask.isPending}
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("action.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
