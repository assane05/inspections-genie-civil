import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  Check,
  ChevronDown,
  Circle,
  Clock,
  FileDown,
  MapPinned,
  Save,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTask, taskKeys } from "@/lib/queries/tasks";
import { useDictionary } from "@/lib/queries/dictionary";
import { useSubmissionsForTask, submissionKeys } from "@/lib/queries/submissions";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image";
import { apiUrl } from "@/lib/api-client";
import { exportFichePdf } from "@/lib/pdf-export";
import {
  buildingItemCount,
  categoryDefectCount,
  defaultBuildingPoints,
  type BuildingCategory,
} from "@/lib/building-checklist";
import {
  pointState,
  SEVERITIES,
  SEVERITY_LABELS,
  type ChecklistState,
  type PointStatus,
  type Severity,
} from "@/lib/inspection-checklist";
import { clearDraft, enqueueSubmission, loadDraft, saveDraft } from "@/lib/offline-queue";
import { daysUntil, dueState, statusLabel } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supervisor/building/$taskId")({
  component: BuildingTaskForm,
  head: () => ({
    meta: [
      { title: "Fiche d'inspection Bâtiment — LAS Superviseur" },
      {
        name: "description",
        content: "En-tête d'inspection bâtiment : secteur, conformité et commentaires généraux.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

export type Sector = "Landside" | "Airside";
export type Compliance = "conforme" | "non_conforme";

type BuildingDraft = {
  sector: Sector | null;
  compliance: Compliance | null;
  comment: string;
  points: ChecklistState;
};

/** Un item "defaut" mérite le badge Détails s'il porte au moins une information de détail. */
function hasDetail(st: {
  qualitatif: string;
  localisation: string;
  photos: string[];
  actionCorrective: string;
}) {
  return !!(st.qualitatif || st.localisation || st.photos.length || st.actionCorrective);
}

function BuildingTaskForm() {
  const { taskId } = useParams({ from: "/supervisor/building/$taskId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const { data: submissions } = useSubmissionsForTask(taskId);
  const queryClient = useQueryClient();
  const draftKey = `building-${taskId}`;
  // Checklist en vigueur (API, sans redéploiement) — []  le temps du chargement, complétée
  // ensuite par l'effet ci-dessous si aucun brouillon n'était déjà présent.
  const { data: catRes, isLoading: categoriesLoading } =
    useDictionary<BuildingCategory[]>("building-categories");
  const buildingCategories = useMemo(() => catRes?.data ?? [], [catRes]);

  const initial = useMemo<BuildingDraft>(() => {
    const stored = loadDraft<BuildingDraft>(draftKey);
    if (stored?.data) {
      return {
        sector: stored.data.sector ?? null,
        compliance: stored.data.compliance ?? null,
        comment: stored.data.comment ?? "",
        points:
          stored.data.points && Object.keys(stored.data.points).length
            ? stored.data.points
            : defaultBuildingPoints(buildingCategories),
      };
    }
    return {
      sector: null,
      compliance: null,
      comment: "",
      points: defaultBuildingPoints(buildingCategories),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const [sector, setSector] = useState<Sector | null>(initial.sector);
  const [compliance, setCompliance] = useState<Compliance | null>(initial.compliance);
  const [comment, setComment] = useState(initial.comment);
  const [points, setPoints] = useState<ChecklistState>(initial.points);
  const [resumed] = useState(() => !!loadDraft(draftKey));
  const [savedAt, setSavedAt] = useState<number | null>(loadDraft(draftKey)?.savedAt ?? null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // La checklist arrive de façon asynchrone (API) : si aucun brouillon n'a déjà rempli
  // "points" et que les catégories arrivent après le premier rendu, on complète.
  useEffect(() => {
    if (!resumed && buildingCategories.length && Object.keys(points).length === 0) {
      setPoints(defaultBuildingPoints(buildingCategories));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingCategories]);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  if (!task || task.kind !== "batiment" || categoriesLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">
          {taskLoading || categoriesLoading ? "Chargement de la fiche…" : "Tâche introuvable."}
        </p>
        {!taskLoading && !categoriesLoading && (
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/supervisor/tasks">Retour aux tâches</Link>
          </Button>
        )}
      </div>
    );
  }

  const state = dueState(task);
  const statusLabelBefore = statusLabel[task.status];
  const d = daysUntil(task.dueISO);

  const persist = (patch: Partial<BuildingDraft>) => {
    const next = {
      sector: patch.sector !== undefined ? patch.sector : sector,
      compliance: patch.compliance !== undefined ? patch.compliance : compliance,
      comment: patch.comment !== undefined ? patch.comment : comment,
      points: patch.points !== undefined ? patch.points : points,
    };
    saveDraft(draftKey, next);
    setSavedAt(Date.now());
  };

  /** Change le statut d'un item. En quittant "defaut", les champs de détail sont réinitialisés. */
  const setStatus = (id: string, status: PointStatus) => {
    setPoints((p) => {
      const next = {
        ...p,
        [id]:
          status === "defaut"
            ? { ...pointState(p, id), status }
            : {
                ...pointState(p, id),
                status,
                severity: null,
                qualitatif: "",
                localisation: "",
                photos: [],
                actionCorrective: "",
              },
      };
      persist({ points: next });
      return next;
    });
  };

  const setDetail = (
    id: string,
    patch: Partial<
      Pick<ChecklistState[string], "severity" | "qualitatif" | "localisation" | "actionCorrective">
    >,
  ) => {
    setPoints((p) => {
      const next = { ...p, [id]: { ...pointState(p, id), ...patch } };
      persist({ points: next });
      return next;
    });
  };

  const toggleDetails = (id: string) => setOpenDetails((o) => ({ ...o, [id]: !o[id] }));

  /** Capture directe depuis l'appareil photo, compressée, sans quitter la saisie (sprint 8/9). */
  const onPhotoSelect = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPoints((p) => {
        const cur = pointState(p, id);
        const next = { ...p, [id]: { ...cur, photos: [...cur.photos, compressed] } };
        persist({ points: next });
        return next;
      });
    } catch {
      toast.error("Photo illisible", { description: "Réessayez la prise de vue." });
    }
  };

  const removePhoto = (id: string, index: number) =>
    setPoints((p) => {
      const cur = pointState(p, id);
      const next = { ...p, [id]: { ...cur, photos: cur.photos.filter((_, i) => i !== index) } };
      persist({ points: next });
      return next;
    });

  /** Valide l'en-tête et les items ; affiche un toast et renvoie false au premier problème. */
  const validate = (): boolean => {
    if (!sector) {
      toast.error("Secteur manquant", { description: "Sélectionnez Landside ou Airside." });
      return false;
    }
    if (!compliance) {
      toast.error("Conformité manquante", {
        description: "L'en-tête doit être classé Conforme ou Non conforme avant soumission.",
      });
      return false;
    }
    // Un item en défaut doit porter une sévérité avant soumission (même règle que la fiche horizontale).
    for (const cat of buildingCategories) {
      for (const item of cat.items) {
        const st = pointState(points, item.id);
        if (st.status === "defaut" && !st.severity) {
          toast.error("Sévérité manquante", {
            description: `« ${item.label} » (${cat.label}) est en défaut sans sévérité renseignée.`,
          });
          setOpenCategory(cat.id);
          setOpenDetails((o) => ({ ...o, [item.id]: true }));
          return false;
        }
      }
    }
    return true;
  };

  /** Ouvre la confirmation explicite avant envoi (sprint 11) — n'envoie rien tant que non confirmé. */
  const requestSubmit = () => {
    if (validate()) setConfirmOpen(true);
  };

  /** Soumission effective, appelée uniquement après confirmation dans le dialogue. */
  const performSubmit = () => {
    const defects = buildingCategories.flatMap((cat) =>
      cat.items
        .filter((item) => pointState(points, item.id).status === "defaut")
        .map((item) => {
          const st = pointState(points, item.id);
          return {
            category: cat.label,
            item: item.label,
            severity: st.severity,
            action: st.localisation,
            comment: st.qualitatif,
            actionCorrective: st.actionCorrective,
            photos: st.photos,
          };
        }),
    );
    enqueueSubmission(apiUrl("/submissions"), {
      taskId: task.id,
      form: task.form,
      zone: task.zone,
      notes: task.notes,
      group: task.group,
      sector,
      compliance,
      comment,
      defects,
      // Version du dictionnaire "checklist bâtiment" en vigueur à la soumission — une
      // édition ultérieure du modèle n'altère pas rétroactivement cette fiche.
      modelVersion: { buildingCategories: catRes?.version ?? 0 },
    });
    clearDraft(draftKey);
    setConfirmOpen(false);
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
    queryClient.invalidateQueries({ queryKey: submissionKeys.byTask(task.id) });
    toast.success("Fiche soumise — En attente de vérification", {
      description: navigator.onLine
        ? `${defects.length} défaut(s) transmis.`
        : "Hors-ligne : en file d'attente, envoi automatique à la reconnexion.",
    });
    navigate({ to: "/supervisor/tasks" });
  };

  const totalDefects = buildingCategories.reduce((n, c) => n + categoryDefectCount(points, c), 0);
  /** Toutes les photos de la fiche, tous items confondus — pour la galerie (sprint 10). */
  const allPhotos = buildingCategories.flatMap((cat) =>
    cat.items.flatMap((item) => pointState(points, item.id).photos),
  );

  /** Export PDF fidèle au contenu saisi (sprint 14) — disponible en brouillon ou après soumission. */
  const downloadPdf = () => {
    const lastSubmission = submissions?.[0];
    const constats = buildingCategories.flatMap((cat) =>
      cat.items
        .filter((item) => pointState(points, item.id).status === "defaut")
        .map((item) => {
          const st = pointState(points, item.id);
          return {
            heading: `${cat.code} · ${cat.label} · ${item.label}`,
            fields: [
              { label: "Sévérité", value: st.severity ? SEVERITY_LABELS[st.severity] : "" },
              { label: "Commentaire", value: st.qualitatif },
              { label: "Action (localisation)", value: st.localisation },
              { label: "Action corrective", value: st.actionCorrective },
            ],
            photos: st.photos,
          };
        }),
    );
    exportFichePdf({
      title: task.form,
      subtitle: `${task.zone} — ${task.group}`,
      status: lastSubmission ? "En attente de vérification" : statusLabelBefore,
      meta: [
        { label: "Bâtiment / Notes", value: `${task.zone} · ${task.notes}` },
        { label: "Semaine", value: `S${task.week} · Bimestre ${task.bimester}` },
        { label: "Échéance", value: task.dueDate },
        { label: "Groupe", value: task.group },
        { label: "Secteur", value: sector ?? "" },
        {
          label: "Conformité",
          value:
            compliance === "conforme"
              ? "Conforme"
              : compliance === "non_conforme"
                ? "Non conforme"
                : "",
        },
      ],
      constats,
      comment,
      submittedBy: lastSubmission?.submittedBy.name ?? null,
      submittedAt: lastSubmission?.submittedAt ?? null,
    });
  };

  return (
    <div className="pb-28 md:pb-10">
      <PageHeader
        eyebrow="Fiche d'inspection bâtiment"
        title={task.form}
        subtitle={`${task.zone} — ${task.group}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={downloadPdf}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/supervisor/tasks">
                <ArrowLeft className="h-4 w-4" /> Retour
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        {/* Contexte repris automatiquement de la tâche */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Bâtiment / Notes", `${task.zone} · ${task.notes}`],
              ["Semaine", `S${task.week} · Bimestre ${task.bimester}`],
              ["Échéance", task.dueDate],
              ["Groupe", task.group],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 text-sm font-medium">{value}</div>
              </div>
            ))}
          </div>

          {state === "overdue" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" /> Tâche en retard de {Math.abs(d)} jour(s)
            </div>
          )}
          {state === "due_soon" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
              <Clock className="h-4 w-4" />{" "}
              {d === 0 ? "Échéance aujourd'hui" : `Échéance dans ${d} jour(s)`}
            </div>
          )}
        </div>

        {resumed && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" /> Brouillon existant repris automatiquement.
          </div>
        )}

        {/* En-tête d'inspection */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" /> En-tête d'inspection
          </div>

          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <MapPinned className="h-3.5 w-3.5" /> Secteur *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(["Landside", "Airside"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={sector === opt}
                    onClick={() => {
                      setSector(opt);
                      persist({ sector: opt });
                    }}
                    className={cn(
                      "min-h-12 rounded-xl border px-4 text-sm font-semibold transition-colors",
                      sector === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {!sector && (
                <p className="mt-1 text-[11px] text-destructive">
                  Secteur requis avant soumission.
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Conformité *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={compliance === "conforme"}
                  onClick={() => {
                    setCompliance("conforme");
                    persist({ compliance: "conforme" });
                  }}
                  className={cn(
                    "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
                    compliance === "conforme"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <ShieldCheck className="h-4 w-4" /> Conforme
                </button>
                <button
                  type="button"
                  aria-pressed={compliance === "non_conforme"}
                  onClick={() => {
                    setCompliance("non_conforme");
                    persist({ compliance: "non_conforme" });
                  }}
                  className={cn(
                    "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors",
                    compliance === "non_conforme"
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <X className="h-4 w-4" /> Non conforme
                </button>
              </div>
              {!compliance && (
                <p className="mt-1 text-[11px] text-destructive">
                  Critère de conformité requis avant soumission.
                </p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                Commentaires généraux
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  persist({ comment: e.target.value });
                }}
                rows={3}
                className="bg-background/60"
                placeholder="Observations générales sur le bâtiment"
              />
            </div>
          </div>
        </div>

        {/* Checklist bâtiment — catégories A → H, saisie par item (N/A par défaut,
            même logique par exception que la fiche horizontale). */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-sm font-semibold">Checklist bâtiment</div>
            <span className="text-xs text-muted-foreground">
              {buildingCategories.length} catégories · {buildingItemCount(buildingCategories)} items
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Contenu des items proposé à partir de points de contrôle bâtiment standards — à valider
            par les superviseurs avant mise en production. Chaque item est à « N/A » par défaut ; en
            défaut, la sévérité est requise avant soumission.
          </p>
          <div className="space-y-2">
            {buildingCategories.map((cat: BuildingCategory) => {
              const isOpen = openCategory === cat.id;
              const defects = categoryDefectCount(points, cat);
              return (
                <div
                  key={cat.id}
                  className={cn(
                    "overflow-hidden rounded-xl border",
                    defects > 0 ? "border-destructive/40" : "border-border/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {cat.code}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">{cat.label}</span>
                    {defects > 0 ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-destructive">
                        <TriangleAlert className="h-3.5 w-3.5" /> {defects}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {cat.items.length} item(s)
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-border/60 bg-background/40 p-3">
                      {cat.items.map((item) => {
                        const st = pointState(points, item.id);
                        const detailsOpen = !!openDetails[item.id];
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-xl border p-3",
                              st.status === "defaut"
                                ? "border-destructive/40 bg-destructive/5"
                                : "border-border/60 bg-card/60",
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                                {item.label}
                              </span>
                              <div className="flex shrink-0 overflow-hidden rounded-lg border border-border/60">
                                <button
                                  type="button"
                                  aria-pressed={st.status === "ras"}
                                  onClick={() => setStatus(item.id, "ras")}
                                  className={cn(
                                    "min-h-11 px-4 text-sm font-semibold transition-colors",
                                    st.status === "ras"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-transparent text-muted-foreground hover:bg-muted/50",
                                  )}
                                >
                                  N/A
                                </button>
                                <button
                                  type="button"
                                  aria-pressed={st.status === "defaut"}
                                  onClick={() => setStatus(item.id, "defaut")}
                                  className={cn(
                                    "min-h-11 border-l border-border/60 px-4 text-sm font-semibold transition-colors",
                                    st.status === "defaut"
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-transparent text-muted-foreground hover:bg-muted/50",
                                  )}
                                >
                                  Défaut
                                </button>
                              </div>
                            </div>

                            {st.status === "defaut" && (
                              <div className="mt-3 space-y-3">
                                {/* Status : affichage seul, reflète le choix déjà fait ci-dessus */}
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="uppercase tracking-wider">Status :</span>
                                  <span className="font-semibold text-destructive">Défaut</span>
                                </div>

                                <div>
                                  <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Sévérité *
                                  </Label>
                                  <div className="flex gap-2">
                                    {SEVERITIES.map((sev: Severity) => (
                                      <button
                                        key={sev}
                                        type="button"
                                        aria-pressed={st.severity === sev}
                                        onClick={() => setDetail(item.id, { severity: sev })}
                                        className={cn(
                                          "min-h-9 flex-1 rounded-lg border px-3 text-xs font-semibold transition-colors",
                                          st.severity === sev
                                            ? "border-destructive bg-destructive text-destructive-foreground"
                                            : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50",
                                        )}
                                      >
                                        {SEVERITY_LABELS[sev]}
                                      </button>
                                    ))}
                                  </div>
                                  {!st.severity && (
                                    <p className="mt-1 text-[11px] text-destructive">
                                      Sévérité requise avant soumission.
                                    </p>
                                  )}
                                </div>

                                {/* Trigger persistant — jamais un simple hover */}
                                <button
                                  type="button"
                                  onClick={() => toggleDetails(item.id)}
                                  className="flex min-h-9 w-full items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
                                >
                                  <span className="flex items-center gap-2">
                                    Détails
                                    {hasDetail(st) && !detailsOpen && (
                                      <Circle className="h-2 w-2 fill-primary text-primary" />
                                    )}
                                  </span>
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      detailsOpen && "rotate-180",
                                    )}
                                  />
                                </button>

                                {detailsOpen && (
                                  <div className="space-y-3 rounded-lg border border-border/50 bg-background/40 p-3">
                                    <div>
                                      <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                        Action (localisation)
                                      </Label>
                                      <Input
                                        value={st.localisation}
                                        onChange={(e) =>
                                          setDetail(item.id, { localisation: e.target.value })
                                        }
                                        placeholder="Ex. Ouverture d'une fiche de réparation, 2e étage aile Est"
                                        className="h-11 bg-background/60"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                        Commentaire
                                      </Label>
                                      <Textarea
                                        value={st.qualitatif}
                                        onChange={(e) =>
                                          setDetail(item.id, { qualitatif: e.target.value })
                                        }
                                        placeholder="Description du défaut constaté"
                                        rows={2}
                                        className="bg-background/60"
                                      />
                                    </div>
                                    <div>
                                      <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                        Photo(s)
                                      </Label>
                                      <div className="flex flex-wrap gap-2">
                                        {st.photos.map((src, i) => (
                                          <div key={i} className="relative">
                                            <img
                                              src={src}
                                              alt={`Photo ${i + 1} du défaut`}
                                              onClick={() =>
                                                setLightbox({ photos: st.photos, index: i })
                                              }
                                              className="h-20 w-20 cursor-pointer rounded-lg border border-border/60 object-cover"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removePhoto(item.id, i)}
                                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50">
                                          <Camera className="h-4 w-4" />
                                          <span className="text-[10px] font-medium">Ajouter</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                              void onPhotoSelect(item.id, e.target.files?.[0]);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                        Lien vers action corrective
                                      </Label>
                                      <Input
                                        value={st.actionCorrective}
                                        onChange={(e) =>
                                          setDetail(item.id, {
                                            actionCorrective: e.target.value,
                                          })
                                        }
                                        placeholder="Ex. Ouverture d'une fiche de réparation N°…"
                                        className="h-11 bg-background/60"
                                      />
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        Référence facultative d'une fiche d'action corrective liée à
                                        ce constat non conforme.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {allPhotos.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <Label className="mb-2 block text-[11px] uppercase tracking-wider text-muted-foreground">
              Photos de la fiche ({allPhotos.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {allPhotos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Photo ${i + 1} de la fiche`}
                  onClick={() => setLightbox({ photos: allPhotos, index: i })}
                  className="h-20 w-20 cursor-pointer rounded-lg border border-border/60 object-cover transition-opacity hover:opacity-80"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {sector && compliance ? "En-tête complet" : "En-tête incomplet"} · {totalDefects}{" "}
            défaut(s)
            {savedAt ? ` — brouillon ${new Date(savedAt).toLocaleTimeString("fr-FR")}` : ""}
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2 sm:flex-none"
              onClick={() => {
                persist({});
                toast.success("Brouillon enregistré");
              }}
            >
              <Save className="h-4 w-4" /> Brouillon
            </Button>
            <Button
              className="h-12 flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none"
              onClick={requestSubmit}
            >
              <Send className="h-4 w-4" /> Soumettre
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation explicite avant envoi (sprint 11) — évite les soumissions accidentelles. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la soumission ?</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche « {task.form} » ({task.zone}) passera de « {statusLabelBefore} » à « En
              attente de vérification ». {totalDefects} défaut(s) seront transmis.
              {!navigator.onLine &&
                " Vous êtes hors-ligne : la soumission sera mise en file et envoyée automatiquement à la reconnexion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={performSubmit}>Confirmer et soumettre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox((lb) => (lb ? { ...lb, index: i } : lb))}
        />
      )}
    </div>
  );
}
