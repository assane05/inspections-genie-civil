import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ClipboardCheck,
  X,
  Calendar,
  MapPin,
  Users,
  FileText,
  Plus,
  Loader2,
  Sparkles,
  Building2,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAdminGroups } from "@/lib/queries/users";
import { useAssignments, useCreateAssignments, useFormTypesList } from "@/lib/queries/assignments";
import { isoWeek } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks_new")({
  component: NewTask,
  head: () => ({
    meta: [
      { title: "Créer une tâche — LAS Inspections" },
      {
        name: "description",
        content: "Créer et assigner une nouvelle tâche d'inspection.",
      },
    ],
  }),
});

function NewTask() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: formTypes = [], isLoading: formTypesLoading } = useFormTypesList();
  const formGroups = useMemo(
    () => [
      {
        label: "Horizontal",
        items: formTypes.filter((f) => f.module === "horizontal"),
      },
      {
        label: "Bâtiment",
        items: formTypes.filter((f) => f.module === "vertical"),
      },
    ],
    [formTypes],
  );

  const { data: adminGroups = [] } = useAdminGroups();
  const { data: allTasks = [] } = useAssignments();
  const createAssignments = useCreateAssignments();

  const [formTypeId, setFormTypeId] = useState<string>("");
  const [zones, setZones] = useState<string[]>([]);
  const [zoneInput, setZoneInput] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [dueISO, setDueISO] = useState("");
  const [notes, setNotes] = useState("");
  const [comment, setComment] = useState("");

  const selectedFormName = formTypes.find((f) => f.id === formTypeId)?.name;

  const zoneSuggestions = useMemo(() => {
    if (!selectedFormName) return [];
    return [...new Set(allTasks.filter((tk) => tk.form === selectedFormName).map((tk) => tk.zone))]
      .filter(Boolean)
      .sort();
  }, [selectedFormName, allTasks]);

  const toggleZone = (z: string) =>
    setZones((zs) => (zs.includes(z) ? zs.filter((x) => x !== z) : [...zs, z]));

  const addCustomZone = () => {
    const z = zoneInput.trim();
    if (!z) return;
    if (!zones.includes(z)) setZones((zs) => [...zs, z]);
    setZoneInput("");
  };

  const toggleGroup = (id: string) =>
    setGroupIds((gs) => (gs.includes(id) ? gs.filter((x) => x !== id) : [...gs, id]));

  const preview = useMemo(() => {
    if (!dueISO) return null;
    const d = new Date(dueISO + "T00:00:00");
    return {
      week: isoWeek(dueISO),
      bimester: Math.floor(d.getMonth() / 2) + 1,
      year: d.getFullYear(),
    };
  }, [dueISO]);

  const submit = () => {
    if (!formTypeId) {
      toast.error("Formulaire manquant", {
        description: "Choisissez une fiche d'inspection.",
      });
      return;
    }
    if (!zones.length) {
      toast.error("Zone manquante", {
        description: "Ajoutez au moins une zone (assignation individuelle ou en lot).",
      });
      return;
    }
    if (!groupIds.length) {
      toast.error("Groupe manquant", {
        description: "Assignez au moins un groupe de supervision.",
      });
      return;
    }
    if (!dueISO) {
      toast.error("Date limite manquante", {
        description: "Renseignez une date limite.",
      });
      return;
    }

    const combinedNotes = [notes, comment].filter(Boolean).join(" · ") || undefined;

    createAssignments.mutate(
      { formTypeId, zones, groupIds, dueISO, notes: combinedNotes },
      {
        onSuccess: (created) => {
          toast.success(`${created.length} tâche(s) créée(s)`, {
            description: `${zones.length} zone(s) × ${
              groupIds.length
            } groupe(s) — échéance ${new Date(dueISO + "T00:00:00").toLocaleDateString("fr-FR")}.`,
          });
          navigate({ to: "/tasks" });
        },
        onError: () => {
          toast.error("Échec de la création", {
            description: "Réessayez dans un instant.",
          });
        },
      },
    );
  };

  const calculatedTasksCount = zones.length * groupIds.length;

  return (
    <div className="min-h-screen pb-16 bg-muted/20">
      <PageHeader
        eyebrow={t("nav.tasks")}
        title={t("tasks.new.title")}
        subtitle="Assignez une fiche à un ou plusieurs groupes d'inspection, sur une ou plusieurs zones"
      />

      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Section 1: Configuration générale */}
        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">
              1. Type d'inspection & Échéance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="form-select"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Formulaire d'inspection <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formTypeId}
                onValueChange={(v) => {
                  setFormTypeId(v);
                  setZones([]);
                }}
              >
                <SelectTrigger
                  id="form-select"
                  className="h-11 bg-background border-border/80 focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <SelectValue placeholder="Sélectionner un formulaire..." />
                </SelectTrigger>
                <SelectContent>
                  {formGroups.map(
                    (g) =>
                      g.items.length > 0 && (
                        <SelectGroup key={g.label}>
                          <SelectLabel className="font-semibold text-primary">
                            {g.label}
                          </SelectLabel>
                          {g.items.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="due-date"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Date limite d'exécution <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="due-date"
                  type="date"
                  value={dueISO}
                  onChange={(e) => setDueISO(e.target.value)}
                  className="h-11 bg-background border-border/80 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {preview && (
                <div className="flex items-center gap-2 mt-2 text-xs text-primary font-medium bg-primary/5 p-2 rounded-md border border-primary/10">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Semaine <strong>{preview.week}</strong> · Bimestre{" "}
                    <strong>{preview.bimester}</strong> · <strong>{preview.year}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Zones et Groupes */}
        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border/40">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">2. Périmètre & Assignation</h2>
          </div>

          {/* Zones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Zones cibles <span className="text-destructive">*</span>
              </Label>
              <Badge variant="outline" className="text-xs font-normal">
                {zones.length} zone(s) sélectionnée(s)
              </Badge>
            </div>

            {/* Suggestions */}
            {zoneSuggestions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Suggestions basées sur le
                  formulaire :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {zoneSuggestions.map((z) => {
                    const isSelected = zones.includes(z);
                    return (
                      <button
                        key={z}
                        type="button"
                        onClick={() => toggleZone(z)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border/80 hover:border-primary/50 hover:bg-muted/50",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {z}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input d'ajout manuel */}
            <div className="flex gap-2">
              <Input
                value={zoneInput}
                onChange={(e) => setZoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomZone();
                  }
                }}
                placeholder="Ex: Piste 01, Terminal A... (Entrée pour ajouter)"
                className="h-10 bg-background border-border/80"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addCustomZone}
                className="shrink-0 h-10 px-4 gap-1"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>

            {/* Selected zones tags */}
            {zones.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {zones.map((z) => (
                  <span
                    key={z}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-all"
                  >
                    {z}
                    <button
                      type="button"
                      onClick={() => toggleZone(z)}
                      className="rounded-full p-0.5 hover:bg-primary/20 text-primary transition-colors"
                      aria-label={`Retirer ${z}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/40" />

          {/* Groupes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Groupes de supervision <span className="text-destructive">*</span>
              </Label>
              <Badge variant="outline" className="text-xs font-normal">
                {groupIds.length} groupe(s) sélectionné(s)
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {adminGroups.map((g) => {
                const isSelected = groupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30 shadow-sm"
                        : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span className="truncate">{g.name}</span>
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ml-2",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Remarques & Contextes */}
        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold tracking-tight">
              3. Informations complémentaires
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Notes de tâche (Référence / Identifiants)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: EFS; VERS; MT"
                className="h-10 bg-background border-border/80"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="comment"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Instructions supplémentaires
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Précisez ici toute consigne spécifique pour les équipes sur le terrain..."
                className="bg-background border-border/80 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Zone de Validation / Barre de récapitulatif */}
        <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
              {calculatedTasksCount}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {calculatedTasksCount > 0
                  ? `${calculatedTasksCount} tâche(s) à générer`
                  : "Configuration incomplète"}
              </p>
              <p className="text-xs text-muted-foreground">
                {zones.length > 0 && groupIds.length > 0
                  ? `${zones.length} zone(s) × ${groupIds.length} groupe(s)`
                  : "Sélectionnez au moins une zone et un groupe"}
              </p>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 px-6 font-medium shadow-md transition-all hover:shadow-lg"
            onClick={submit}
            disabled={createAssignments.isPending || formTypesLoading}
          >
            {createAssignments.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création en cours…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Créer et assigner
              </>
            )}
          </Button>
        </div>

        {/* Note d'information */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/30 p-3.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Les tâches créées apparaissent immédiatement dans la liste des tâches (admin) et chez
            les superviseurs des groupes assignés, avec les mêmes filtres (formulaire, année,
            bimestre, statut).
          </span>
        </div>
      </div>
    </div>
  );
}
