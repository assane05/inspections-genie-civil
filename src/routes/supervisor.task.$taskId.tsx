import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  CircleDashed,
  Clock,
  FileDown,
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
import { listAllTasks } from "@/lib/admin-tasks";
import { useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/image";
import { submitTask, getTaskOverride } from "@/lib/task-status";
import { exportFichePdf } from "@/lib/pdf-export";
import { clearDraft, enqueueSubmission, loadDraft, saveDraft } from "@/lib/offline-queue";
import { daysUntil, dueState, statusLabel } from "@/lib/tasks";
import {
  resolveFicheType,
  segmentsForTask,
  getFicheCatalogVersion,
  type PhysicalSegment,
} from "@/lib/fiche-catalog";
import {
  categoriesForGroup,
  emptyPoint,
  familyDefectCount,
  familyFullyInspected,
  familyNonInspecteCount,
  familyPointIds,
  getFamiliesVersion,
  namespaceFamilies,
  pointState,
  SEVERITIES,
  SEVERITY_LABELS,
  type ChecklistState,
  type Family,
  type PointStatus,
  type Severity,
} from "@/lib/inspection-checklist";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/supervisor/task/$taskId")({
  component: TaskForm,
  head: () => ({
    meta: [
      { title: "Fiche d'inspection — LAS Superviseur" },
      {
        name: "description",
        content:
          "Saisie par segment physique : chaque point est Non inspecté tant qu'il n'a pas été attesté RAS ou signalé en défaut.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type DraftShape = { points: ChecklistState; acked: string[]; comment: string };

/** Catégories par défaut si la fiche n'est pas (encore) référencée au catalogue. */
const DEFAULT_CATEGORIES = ["surface", "marquage", "balisage", "abords", "drainage"];

/** Un point "defaut" mérite le badge Détails s'il porte au moins une information de détail. */
function hasDetail(st: {
  qualitatif: string;
  localisation: string;
  photos: string[];
  actionCorrective: string;
}) {
  return !!(st.qualitatif || st.localisation || st.photos.length || st.actionCorrective);
}

function segmentPointIds(cats: Family[]): string[] {
  return cats.flatMap(familyPointIds);
}
function segmentDefectCount(state: ChecklistState, cats: Family[]): number {
  return cats.reduce((n, f) => n + familyDefectCount(state, f), 0);
}
function segmentNonInspectedCount(state: ChecklistState, cats: Family[]): number {
  return cats.reduce((n, f) => n + familyNonInspecteCount(state, f), 0);
}
function segmentFullyInspected(state: ChecklistState, cats: Family[]): boolean {
  return segmentNonInspectedCount(state, cats) === 0;
}

function TaskForm() {
  const { taskId } = useParams({ from: "/supervisor/task/$taskId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const task = listAllTasks().find((t) => t.id === taskId);
  const draftKey = `task-${taskId}`;

  const initial = useMemo<DraftShape>(() => {
    const stored = loadDraft<DraftShape>(draftKey);
    if (stored?.data) {
      const d = stored.data;
      return { points: d.points ?? {}, acked: d.acked ?? [], comment: d.comment ?? "" };
    }
    return { points: {}, acked: [], comment: "" };
  }, [draftKey]);

  const [points, setPoints] = useState<ChecklistState>(initial.points);
  const [acked, setAcked] = useState<string[]>(initial.acked);
  const [comment, setComment] = useState(initial.comment);
  const [openSegment, setOpenSegment] = useState<string | null>(null);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [resumed] = useState(() => !!loadDraft(draftKey));
  const [savedAt, setSavedAt] = useState<number | null>(loadDraft(draftKey)?.savedAt ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  // Fiche du catalogue → catégories applicables → segments physiques dynamiques de la tâche.
  const fiche = useMemo(() => (task ? resolveFicheType(task.form) : undefined), [task]);
  const physicalSegments = useMemo<PhysicalSegment[]>(
    () => (task ? segmentsForTask(fiche, task) : []),
    [task, fiche],
  );
  const categories = useMemo(
    () => categoriesForGroup(fiche?.categories ?? DEFAULT_CATEGORIES),
    [fiche],
  );
  const segmentCategories = useMemo(
    () => new Map(physicalSegments.map((seg) => [seg.id, namespaceFamilies(categories, seg.id)])),
    [physicalSegments, categories],
  );

  useEffect(() => {
    if (!openSegment && physicalSegments.length) setOpenSegment(physicalSegments[0].id);
  }, [physicalSegments, openSegment]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveDraft(draftKey, { points, acked, comment });
      setSavedAt(Date.now());
    }, 600);
    return () => window.clearTimeout(id);
  }, [points, acked, comment, draftKey]);

  if (!task) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Tâche introuvable.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/supervisor/tasks">Retour aux tâches</Link>
        </Button>
      </div>
    );
  }

  const state = dueState(task);
  const d = daysUntil(task.dueISO);

  /** Change le statut d'un point. En quittant "defaut", les champs de détail sont réinitialisés. */
  const setStatus = (id: string, status: PointStatus) =>
    setPoints((p) => ({
      ...p,
      [id]: status === "defaut" ? { ...pointState(p, id), status } : { ...emptyPoint, status },
    }));

  const setDetail = (
    id: string,
    patch: Partial<
      Pick<ChecklistState[string], "severity" | "qualitatif" | "localisation" | "actionCorrective">
    >,
  ) => setPoints((p) => ({ ...p, [id]: { ...pointState(p, id), ...patch } }));

  const toggleDetails = (id: string) => setOpenDetails((o) => ({ ...o, [id]: !o[id] }));

  /** Capture directe depuis l'appareil photo, compressée, sans quitter la saisie (sprint 8/9). */
  const onPhotoSelect = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPoints((p) => {
        const cur = pointState(p, id);
        return { ...p, [id]: { ...cur, photos: [...cur.photos, compressed] } };
      });
    } catch {
      toast.error("Photo illisible", { description: "Réessayez la prise de vue." });
    }
  };

  const removePhoto = (id: string, index: number) =>
    setPoints((p) => {
      const cur = pointState(p, id);
      return { ...p, [id]: { ...cur, photos: cur.photos.filter((_, i) => i !== index) } };
    });

  const markAllRas = (segmentId: string) => {
    const seg = physicalSegments.find((s) => s.id === segmentId)!;
    const cats = segmentCategories.get(segmentId)!;
    setPoints((p) => {
      const next = { ...p };
      for (const id of segmentPointIds(cats)) next[id] = { ...emptyPoint, status: "ras" };
      return next;
    });
    setAcked((a) => (a.includes(segmentId) ? a : [...a, segmentId]));
    toast.success(`« ${seg.label} » attesté RAS`, {
      description: "Tous les points de ce segment sont marqués sans défaut.",
    });
  };

  /**
   * "acked" (posé par « Tout RAS ») ne sert qu'à choisir le libellé affiché — jamais à
   * décider si le segment est complet : si un point est remis à "non_inspecte" après coup,
   * le segment redevient à traiter, même s'il a été attesté RAS auparavant.
   */
  const reviewed = (segmentId: string) => {
    const cats = segmentCategories.get(segmentId)!;
    return segmentFullyInspected(points, cats);
  };

  const remaining = physicalSegments.filter((s) => !reviewed(s.id));
  const totalDefects = physicalSegments.reduce(
    (n, s) => n + segmentDefectCount(points, segmentCategories.get(s.id)!),
    0,
  );
  const totalNonInspected = physicalSegments.reduce(
    (n, s) => n + segmentNonInspectedCount(points, segmentCategories.get(s.id)!),
    0,
  );

  /** Toutes les photos de la fiche, tous constats confondus — pour la galerie (sprint 10). */
  const allPhotos = physicalSegments.flatMap((seg) => {
    const cats = segmentCategories.get(seg.id)!;
    return cats.flatMap((f) =>
      f.segments.flatMap((s) => s.points.flatMap((p) => pointState(points, p.id).photos)),
    );
  });

  const statusLabelBefore = statusLabel[task.status];

  /** Valide la fiche ; affiche un toast et renvoie false au premier problème trouvé. */
  const validate = (): boolean => {
    if (remaining.length) {
      toast.error("Segments non attestés", {
        description: `${remaining.length} segment(s) à traiter : ${remaining.map((s) => s.label).join(", ")}`,
      });
      setOpenSegment(remaining[0].id);
      return false;
    }
    // Un défaut doit porter une sévérité avant soumission.
    for (const seg of physicalSegments) {
      const cats = segmentCategories.get(seg.id)!;
      for (const f of cats) {
        for (const s of f.segments) {
          for (const p of s.points) {
            const st = pointState(points, p.id);
            if (st.status === "defaut" && !st.severity) {
              toast.error("Sévérité manquante", {
                description: `« ${p.label} » (${seg.label} · ${f.label}) est en défaut sans sévérité renseignée.`,
              });
              setOpenSegment(seg.id);
              setOpenDetails((o) => ({ ...o, [p.id]: true }));
              return false;
            }
          }
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
    const defects = physicalSegments.flatMap((seg) => {
      const cats = segmentCategories.get(seg.id)!;
      return cats.flatMap((f) =>
        f.segments.flatMap((s) =>
          s.points
            .filter((p) => pointState(points, p.id).status === "defaut")
            .map((p) => {
              const st = pointState(points, p.id);
              return {
                segment: seg.label,
                category: f.label,
                zone: s.label,
                point: p.label,
                severity: st.severity,
                qualitatif: st.qualitatif,
                localisation: st.localisation,
                photos: st.photos,
                actionCorrective: st.actionCorrective,
              };
            }),
        ),
      );
    });
    const submittedBy = user?.name ?? "Superviseur";
    enqueueSubmission("/api/public/inspections", {
      taskId: task.id,
      form: task.form,
      ficheId: fiche?.id ?? null,
      ficheCode: fiche?.code ?? null,
      zone: task.zone,
      notes: task.notes,
      week: task.week,
      dueDate: task.dueISO,
      group: task.group,
      attestedSegments: acked,
      defects,
      comment,
      submittedBy,
      // Horodatage client — voir la limite documentée dans task-status.ts (nécessite un
      // horodatage serveur fiable une fois le backend en place).
      submittedAt: new Date().toISOString(),
      // Version des dictionnaires (familles + catalogue de fiches) en vigueur à la
      // soumission — une édition ultérieure du modèle n'altère pas rétroactivement
      // cette fiche déjà soumise.
      modelVersion: { families: getFamiliesVersion(), ficheCatalog: getFicheCatalogVersion() },
    });
    submitTask(task.id, submittedBy);
    clearDraft(draftKey);
    setConfirmOpen(false);
    toast.success("Fiche soumise — En attente de vérification", {
      description: navigator.onLine
        ? `${defects.length} défaut(s) transmis.`
        : "Hors-ligne : la fiche est en file d'attente et sera envoyée automatiquement.",
    });
    navigate({ to: "/supervisor/tasks" });
  };

  /** Export PDF fidèle au contenu saisi (sprint 14) — disponible en brouillon ou après soumission. */
  const downloadPdf = () => {
    const override = getTaskOverride(task.id);
    const constats = physicalSegments.flatMap((seg) => {
      const cats = segmentCategories.get(seg.id)!;
      return cats.flatMap((f) =>
        f.segments.flatMap((s) =>
          s.points
            .filter((p) => pointState(points, p.id).status === "defaut")
            .map((p) => {
              const st = pointState(points, p.id);
              return {
                heading: `${seg.label} · ${f.label} · ${s.label} · ${p.label}`,
                fields: [
                  { label: "Sévérité", value: st.severity ? SEVERITY_LABELS[st.severity] : "" },
                  { label: "Révélé qualitatif", value: st.qualitatif },
                  { label: "Localisation", value: st.localisation },
                  { label: "Action corrective", value: st.actionCorrective },
                ],
                photos: st.photos,
              };
            }),
        ),
      );
    });
    exportFichePdf({
      title: task.form,
      subtitle: `${task.zone} — ${task.group}`,
      status: override ? "En attente de vérification" : statusLabelBefore,
      meta: [
        { label: "Zone / Notes", value: `${task.zone} · ${task.notes}` },
        { label: "Semaine", value: `S${task.week} · Bimestre ${task.bimester}` },
        { label: "Échéance", value: task.dueDate },
        { label: "Groupe", value: task.group },
      ],
      constats,
      comment,
      submittedBy: override?.submittedBy ?? null,
      submittedAt: override?.submittedAt ?? null,
    });
  };

  return (
    <div className="pb-28 md:pb-10">
      <PageHeader
        eyebrow="Fiche d'inspection"
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
              ["Zone / Notes", `${task.zone} · ${task.notes}`],
              ["Semaine", `S${task.week} · Bimestre ${task.bimester}`],
              ["Échéance", task.dueDate],
              ["Groupe", task.group + (fiche?.code ? ` · ${fiche.code}` : "")],
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

          {!fiche && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" /> Fiche absente du catalogue — segmentation
              générique appliquée (1/3·2/3·3/3), à valider par un superviseur.
            </div>
          )}
        </div>

        {resumed && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" /> Brouillon existant repris automatiquement.
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
          Chaque point est <strong className="text-foreground">Non inspecté</strong> tant que vous
          ne l'avez pas traité. Attestez chaque segment avec « Tout RAS », ou renseignez chaque
          point (RAS ou Défaut) individuellement — un point non renseigné reste « Non inspecté » et
          n'est jamais compté comme RAS.
        </div>

        {/* Progression par segment physique (1/3·2/3·3/3, ou plage dynamique type SR 5..8) */}
        <div className="flex flex-wrap gap-2">
          {physicalSegments.map((seg) => {
            const cats = segmentCategories.get(seg.id)!;
            const def = segmentDefectCount(points, cats);
            const nonInspected = segmentNonInspectedCount(points, cats);
            const ok = reviewed(seg.id);
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setOpenSegment(seg.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                  def > 0
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : ok
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : nonInspected > 0
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : "border-border/60 bg-card/60 text-muted-foreground",
                )}
              >
                {def > 0 ? (
                  <TriangleAlert className="h-4 w-4" />
                ) : ok ? (
                  <Check className="h-4 w-4" />
                ) : nonInspected > 0 ? (
                  <CircleDashed className="h-4 w-4" />
                ) : null}
                {seg.label}
                {def > 0 && <span className="font-mono">{def}</span>}
              </button>
            );
          })}
        </div>

        {/* Liste scannable par segment physique */}
        {physicalSegments.map((seg) => {
          const isOpen = openSegment === seg.id;
          const cats = segmentCategories.get(seg.id)!;
          const defects = segmentDefectCount(points, cats);
          const nonInspected = segmentNonInspectedCount(points, cats);
          const ok = reviewed(seg.id);
          return (
            <section
              key={seg.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card/60 transition-colors",
                defects > 0
                  ? "border-destructive/40"
                  : ok
                    ? "border-primary/40"
                    : "border-border/60",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenSegment(isOpen ? null : seg.id)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{seg.label}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {defects > 0
                      ? `${defects} défaut(s) relevé(s)`
                      : nonInspected > 0
                        ? `${nonInspected} point(s) non inspecté(s)`
                        : acked.includes(seg.id)
                          ? "Attesté RAS"
                          : "RAS"}
                  </div>
                </div>
                {defects > 0 ? (
                  <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
                ) : nonInspected > 0 ? (
                  <CircleDashed className="h-5 w-5 shrink-0 text-warning" />
                ) : (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                )}
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-border/60 bg-background/40 p-4">
                  <Button
                    type="button"
                    onClick={() => markAllRas(seg.id)}
                    className="mb-4 h-14 w-full gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <CheckCheck className="h-5 w-5" /> Tout RAS — {seg.label}
                  </Button>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Vaut attestation d'inspection : tous les points de ce segment sont déclarés sans
                    défaut.
                  </p>

                  <div className="space-y-6">
                    {cats.map((category) => (
                      <div key={category.id}>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                          {category.label}
                        </div>
                        <div className="space-y-5">
                          {category.segments.map((sub) => (
                            <div key={sub.id}>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {sub.label}
                              </div>
                              <div className="space-y-2">
                                {sub.points.map((p) => {
                                  const st = pointState(points, p.id);
                                  const detailsOpen = !!openDetails[p.id];
                                  return (
                                    <div
                                      key={p.id}
                                      className={cn(
                                        "rounded-xl border p-3",
                                        st.status === "defaut"
                                          ? "border-destructive/40 bg-destructive/5"
                                          : st.status === "ras"
                                            ? "border-primary/30 bg-card/60"
                                            : "border-dashed border-border/60 bg-card/40",
                                      )}
                                    >
                                      <div className="flex flex-wrap items-center gap-3">
                                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                                          {p.label}
                                        </span>
                                        <div className="flex shrink-0 overflow-hidden rounded-lg border border-border/60">
                                          <button
                                            type="button"
                                            aria-pressed={st.status === "non_inspecte"}
                                            onClick={() => setStatus(p.id, "non_inspecte")}
                                            title="Non inspecté"
                                            className={cn(
                                              "flex min-h-11 items-center gap-1 px-3 text-xs font-semibold transition-colors",
                                              st.status === "non_inspecte"
                                                ? "bg-warning/20 text-warning"
                                                : "bg-transparent text-muted-foreground hover:bg-muted/50",
                                            )}
                                          >
                                            <CircleDashed className="h-3.5 w-3.5" /> N/I
                                          </button>
                                          <button
                                            type="button"
                                            aria-pressed={st.status === "ras"}
                                            onClick={() => setStatus(p.id, "ras")}
                                            className={cn(
                                              "min-h-11 border-l border-border/60 px-4 text-sm font-semibold transition-colors",
                                              st.status === "ras"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-transparent text-muted-foreground hover:bg-muted/50",
                                            )}
                                          >
                                            RAS
                                          </button>
                                          <button
                                            type="button"
                                            aria-pressed={st.status === "defaut"}
                                            onClick={() => setStatus(p.id, "defaut")}
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
                                          {/* État requis, toujours visible dès le passage en défaut */}
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
                                                  onClick={() => setDetail(p.id, { severity: sev })}
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
                                            onClick={() => toggleDetails(p.id)}
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
                                                  Révélé qualitatif
                                                </Label>
                                                <Textarea
                                                  value={st.qualitatif}
                                                  onChange={(e) =>
                                                    setDetail(p.id, { qualitatif: e.target.value })
                                                  }
                                                  placeholder="Description qualitative du défaut constaté"
                                                  rows={2}
                                                  className="bg-background/60"
                                                />
                                              </div>
                                              <div>
                                                <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
                                                  Localisation
                                                </Label>
                                                <Input
                                                  value={st.localisation}
                                                  onChange={(e) =>
                                                    setDetail(p.id, {
                                                      localisation: e.target.value,
                                                    })
                                                  }
                                                  placeholder="Ex. PK 350, côté droit"
                                                  className="h-11 bg-background/60"
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
                                                          setLightbox({
                                                            photos: st.photos,
                                                            index: i,
                                                          })
                                                        }
                                                        className="h-20 w-20 cursor-pointer rounded-lg border border-border/60 object-cover"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => removePhoto(p.id, i)}
                                                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                                                      >
                                                        <X className="h-3.5 w-3.5" />
                                                      </button>
                                                    </div>
                                                  ))}
                                                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50">
                                                    <Camera className="h-4 w-4" />
                                                    <span className="text-[10px] font-medium">
                                                      Ajouter
                                                    </span>
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      capture="environment"
                                                      className="hidden"
                                                      onChange={(e) => {
                                                        void onPhotoSelect(
                                                          p.id,
                                                          e.target.files?.[0],
                                                        );
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
                                                    setDetail(p.id, {
                                                      actionCorrective: e.target.value,
                                                    })
                                                  }
                                                  placeholder="Ex. Ouverture d'une fiche de réparation N°…"
                                                  className="h-11 bg-background/60"
                                                />
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                  Référence facultative d'une fiche d'action
                                                  corrective liée à ce constat.
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
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}

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

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <Label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
            Commentaire général
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="bg-background/60"
            placeholder="Observations complémentaires"
          />
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {remaining.length
              ? `${remaining.length} segment(s) restant à attester · ${totalNonInspected} point(s) non inspecté(s) · ${totalDefects} défaut(s)`
              : `Tous les segments attestés · ${totalDefects} défaut(s)`}
            {savedAt ? ` — brouillon ${new Date(savedAt).toLocaleTimeString("fr-FR")}` : ""}
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2 sm:flex-none"
              onClick={() => {
                saveDraft(draftKey, { points, acked, comment });
                setSavedAt(Date.now());
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
