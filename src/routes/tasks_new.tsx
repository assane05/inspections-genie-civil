import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ClipboardCheck, X } from "lucide-react";
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
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useAdminUsers } from "@/lib/queries/users";
import { useAssignments, useCreateAssignments, useFormTypesList } from "@/lib/queries/assignments";
import { isoWeek } from "@/lib/mock-data";

export const Route = createFileRoute("/tasks_new")({
  component: NewTask,
  head: () => ({
    meta: [
      { title: "Créer une tâche — LAS Inspections" },
      { name: "description", content: "Créer une fiche et l'affecter à un superviseur." },
    ],
  }),
});

function NewTask() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: formTypes = [], isLoading: formTypesLoading } = useFormTypesList();
  const formGroups = useMemo(
    () => [
      { label: "Horizontal", items: formTypes.filter((f) => f.module === "horizontal") },
      { label: "Bâtiment", items: formTypes.filter((f) => f.module === "vertical") },
    ],
    [formTypes],
  );

  const { data: allUsers = [] } = useAdminUsers();
  const supervisors = useMemo(
    () => allUsers.filter((u) => u.role === "superviseur" && u.isActive),
    [allUsers],
  );

  const { data: allTasks = [] } = useAssignments();
  const createAssignments = useCreateAssignments();

  const [formTypeId, setFormTypeId] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [zoneInput, setZoneInput] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
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
      toast.error("Formulaire manquant", { description: "Choisissez une fiche d'inspection." });
      return;
    }
    if (!zones.length) {
      toast.error("Zone manquante", { description: "Ajoutez au moins une zone." });
      return;
    }
    if (!assignedToId) {
      toast.error("Superviseur manquant", {
        description: "Choisissez le superviseur qui recevra cette fiche.",
      });
      return;
    }
    if (!dueISO) {
      toast.error("Date limite manquante", { description: "Renseignez une date limite." });
      return;
    }

    const combinedNotes = [notes, comment].filter(Boolean).join(" · ") || undefined;

    createAssignments.mutate(
      { formTypeId, zones, assignedToId, dueISO, notes: combinedNotes },
      {
        onSuccess: (created) => {
          const supervisorName = supervisors.find((s) => s.id === assignedToId)?.displayName;
          toast.success(`${created.length} fiche(s) affectée(s)`, {
            description: `À ${supervisorName} — échéance ${new Date(dueISO + "T00:00:00").toLocaleDateString("fr-FR")}.`,
          });
          navigate({ to: "/tasks" });
        },
        onError: () => {
          toast.error("Échec de la création", { description: "Réessayez dans un instant." });
        },
      },
    );
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.tasks")}
        title={t("tasks.new.title")}
        subtitle="Affectez une fiche d'inspection à un superviseur précis"
      />
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Formulaire d'inspection
              </Label>
              <Select
                value={formTypeId}
                onValueChange={(v) => {
                  setFormTypeId(v);
                  setZones([]);
                }}
              >
                <SelectTrigger className="h-10 bg-background/60">
                  <SelectValue placeholder="Choisir un formulaire" />
                </SelectTrigger>
                <SelectContent>
                  {formGroups.map(
                    (g) =>
                      g.items.length > 0 && (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
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

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Superviseur affecté
              </Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="h-10 bg-background/60">
                  <SelectValue placeholder="Choisir un superviseur" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Date limite
              </Label>
              <Input
                type="date"
                value={dueISO}
                onChange={(e) => setDueISO(e.target.value)}
                className="h-10 bg-background/60"
              />
              {preview && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Semaine {preview.week} · Bimestre {preview.bimester} · {preview.year}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Notes de tâche
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="EFS; VERS; MT"
                className="h-10 bg-background/60"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Zones ({zones.length}) — une fiche sera créée par zone, toutes affectées au même
                superviseur
              </Label>
              {zoneSuggestions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {zoneSuggestions.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleZone(z)}
                      className={
                        zones.includes(z)
                          ? "rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-sm text-primary"
                          : "rounded-lg border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/40"
                      }
                    >
                      {z}
                    </button>
                  ))}
                </div>
              )}
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
                  placeholder="Ajouter une zone (Entrée)"
                  className="h-10 bg-background/60"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomZone}
                  className="shrink-0"
                >
                  Ajouter
                </Button>
              </div>
              {zones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {zones.map((z) => (
                    <span
                      key={z}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {z}
                      <button
                        type="button"
                        onClick={() => toggleZone(z)}
                        aria-label={`Retirer ${z}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Instructions supplémentaires
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Décrivez le contexte de la tâche…"
                className="bg-background/60"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5">
            <span className="text-xs text-muted-foreground">
              {zones.length > 0
                ? `${zones.length} fiche(s) seront créées et affectées`
                : "Choisissez au moins une zone"}
            </span>
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={submit}
              disabled={createAssignments.isPending || formTypesLoading}
            >
              <Check className="h-4 w-4" />
              {createAssignments.isPending ? "Création…" : "Créer et affecter"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          La fiche apparaît immédiatement chez le superviseur affecté (lui seul, pas tout son
          groupe) et dans votre liste "Fiches soumises" une fois traitée.
        </div>
      </div>
    </div>
  );
}
