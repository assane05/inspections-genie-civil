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
import { ficheCatalog } from "@/lib/fiche-catalog";
import { SUPERVISOR_GROUPS } from "@/lib/auth-api";
import { createTasks, listAllTasks, isoWeek } from "@/lib/admin-tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks/new")({
  component: NewTask,
  head: () => ({
    meta: [
      { title: "Créer une tâche — LAS Inspections" },
      { name: "description", content: "Créer et assigner une nouvelle tâche d'inspection." },
    ],
  }),
});

const BUILDING_FORM = "Fiche d'inspection Bâtiment";

/** Formulaires disponibles, groupés — catalogue horizontal + fiche bâtiment. */
const FORM_GROUPS: { group: string; forms: string[] }[] = [
  ...Object.entries(
    ficheCatalog.reduce<Record<string, string[]>>((acc, f) => {
      (acc[f.group] ??= []).push(f.label);
      return acc;
    }, {}),
  ).map(([group, forms]) => ({ group, forms })),
  { group: "Bâtiment", forms: [BUILDING_FORM] },
];

function NewTask() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState<string>("");
  const [zones, setZones] = useState<string[]>([]);
  const [zoneInput, setZoneInput] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [dueISO, setDueISO] = useState("");
  const [notes, setNotes] = useState("");
  const [comment, setComment] = useState("");

  // Suggestions de zones déjà utilisées pour ce formulaire (mock + tâches créées par l'admin) —
  // évite de ressaisir "Runway 05/23" à la main à chaque fois, tout en restant libre (sprint
  // "Assignation des tâches").
  const zoneSuggestions = useMemo(() => {
    if (!form) return [];
    return [
      ...new Set(
        listAllTasks()
          .filter((t) => t.form === form)
          .map((t) => t.zone),
      ),
    ].sort();
  }, [form]);

  const toggleZone = (z: string) =>
    setZones((zs) => (zs.includes(z) ? zs.filter((x) => x !== z) : [...zs, z]));

  const addCustomZone = () => {
    const z = zoneInput.trim();
    if (!z) return;
    if (!zones.includes(z)) setZones((zs) => [...zs, z]);
    setZoneInput("");
  };

  const toggleGroup = (g: string) =>
    setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

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
    if (!form) {
      toast.error("Formulaire manquant", { description: "Choisissez une fiche d'inspection." });
      return;
    }
    if (!zones.length) {
      toast.error("Zone manquante", {
        description: "Ajoutez au moins une zone (assignation individuelle ou en lot).",
      });
      return;
    }
    if (!groups.length) {
      toast.error("Groupe manquant", {
        description: "Assignez au moins un groupe de supervision.",
      });
      return;
    }
    if (!dueISO) {
      toast.error("Date limite manquante", { description: "Renseignez une date limite." });
      return;
    }
    const created = createTasks({
      form,
      zones,
      groups,
      notes,
      dueISO,
      kind: form === BUILDING_FORM ? "batiment" : "horizontal",
    });
    toast.success(`${created.length} tâche(s) créée(s)`, {
      description: `${zones.length} zone(s) × ${groups.length} groupe(s) — échéance ${new Date(dueISO + "T00:00:00").toLocaleDateString("fr-FR")}.`,
    });
    navigate({ to: "/tasks" });
  };

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("nav.tasks")}
        title={t("tasks.new.title")}
        subtitle="Assignez une fiche à un ou plusieurs groupes d'inspection, sur une ou plusieurs zones"
      />
      <div className="mx-auto max-w-4xl p-6 md:p-8">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Formulaire d'inspection
              </Label>
              <Select
                value={form}
                onValueChange={(v) => {
                  setForm(v);
                  setZones([]);
                }}
              >
                <SelectTrigger className="h-10 bg-background/60">
                  <SelectValue placeholder="Choisir un formulaire" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_GROUPS.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.group}</SelectLabel>
                      {g.forms.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectGroup>
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

            <div className="md:col-span-2">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
                Zones ({zones.length}) — assignation individuelle (1 zone) ou en lot (plusieurs)
              </Label>
              {zoneSuggestions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {zoneSuggestions.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleZone(z)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        zones.includes(z)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40",
                      )}
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
                  placeholder={
                    form === BUILDING_FORM ? "Ex. Terminal 2" : "Ajouter une zone (Entrée)"
                  }
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
                Groupes assignés ({groups.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {SUPERVISOR_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGroup(g)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      groups.includes(g)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
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
              {zones.length > 0 && groups.length > 0
                ? `${zones.length * groups.length} tâche(s) seront créées (${zones.length} zone(s) × ${groups.length} groupe(s))`
                : "Choisissez au moins une zone et un groupe"}
            </span>
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_var(--color-primary)]"
              onClick={submit}
            >
              <Check className="h-4 w-4" /> Créer et assigner
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          Les tâches créées apparaissent immédiatement dans la liste des tâches (admin) et chez les
          superviseurs des groupes assignés, avec les mêmes filtres (formulaire, année, bimestre,
          statut).
        </div>
      </div>
    </div>
  );
}
