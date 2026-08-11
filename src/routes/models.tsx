import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, RotateCcw, Save, History, Info, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDictionary, useResetDictionary, useSaveDictionary } from "@/lib/queries/dictionary";
import { type Family, type Segment } from "@/lib/inspection-checklist";
import { type FicheType, type SegmentationKind } from "@/lib/fiche-catalog";
import { type BuildingCategory } from "@/lib/building-checklist";

export const Route = createFileRoute("/models")({
  component: ModelsPage,
  head: () => ({
    meta: [
      { title: "Modèles de formulaires — LAS Inspections" },
      {
        name: "description",
        content:
          "Dictionnaire des fiches : familles, types de fiche, checklist bâtiment. Éditable sans redéploiement.",
      },
    ],
  }),
});

/* ---------- Aides texte <-> structures (édition en masse, simple et robuste) ---------- */

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

/** Un bloc par segment : 1ère ligne = libellé, lignes suivantes "- point" = points de contrôle. */
function segmentsToText(segments: Segment[]): string {
  return segments
    .map((s) => `${s.label}\n${s.points.map((p) => `- ${p.label}`).join("\n")}`)
    .join("\n\n");
}
function textToSegments(familyId: string, text: string): Segment[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block, bi) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const label = lines[0] ?? `Segment ${bi + 1}`;
    const segId = `${familyId}.${slugify(label)}`;
    const points = lines.slice(1).map((l, pi) => ({
      id: `${segId}.${pi + 1}`,
      label: l.replace(/^-\s*/, ""),
    }));
    return { id: segId, label, points };
  });
}

function itemsToText(items: { label: string }[]): string {
  return items.map((i) => i.label).join("\n");
}
function textToItems(catId: string, text: string): { id: string; label: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: `${catId}.${i + 1}`, label }));
}

/* ---------- Petits composants d'UI communs ---------- */

function LoadingCard() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
      Impossible de charger ces données. Vérifiez votre connexion.
    </div>
  );
}

function VersionBar({
  version,
  onReset,
  onSave,
  saving,
  resetting,
}: {
  version: number;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  resetting: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Version {version}
        {version > 1 ? " · personnalisée" : " · valeurs par défaut"}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onReset}
          disabled={resetting}
        >
          <RotateCcw className="h-3.5 w-3.5" /> {resetting ? "Réinitialisation…" : "Réinitialiser"}
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onSave}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Onglet 1 : types de fiche ---------- */

const FAMILY_IDS = ["surface", "marquage", "balisage", "abords", "drainage", "surete"];

function FicheCatalogEditor({
  initial,
  version: initialVersion,
}: {
  initial: FicheType[];
  version: number;
}) {
  const [items, setItems] = useState<FicheType[]>(initial);
  const [version, setVersion] = useState(initialVersion);
  const saveMutation = useSaveDictionary<FicheType[]>("fiche-catalog");
  const resetMutation = useResetDictionary<FicheType[]>("fiche-catalog");

  const update = (i: number, patch: Partial<FicheType>) =>
    setItems((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const toggleCategory = (i: number, cat: string) =>
    setItems((arr) =>
      arr.map((f, idx) =>
        idx === i
          ? {
              ...f,
              categories: f.categories.includes(cat)
                ? f.categories.filter((c) => c !== cat)
                : [...f.categories, cat],
            }
          : f,
      ),
    );

  const addFiche = () =>
    setItems((arr) => [
      ...arr,
      {
        id: `fiche-${Date.now()}`,
        code: null,
        label: "Nouvelle fiche",
        group: "Autre",
        categories: ["surface"],
        segmentation: "linear" as SegmentationKind,
        confirmed: false,
      },
    ]);

  const removeFiche = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const save = () =>
    saveMutation.mutate(items, {
      onSuccess: (res) => {
        setVersion(res.version);
        toast.success("Catalogue de fiches enregistré", {
          description: `Nouvelle version : ${res.version}.`,
        });
      },
      onError: () => toast.error("Échec de l'enregistrement", { description: "Réessayez." }),
    });
  const reset = () =>
    resetMutation.mutate(undefined, {
      onSuccess: (res) => {
        setItems(res.data);
        setVersion(res.version);
        toast.success("Catalogue de fiches réinitialisé aux valeurs par défaut");
      },
      onError: () => toast.error("Échec de la réinitialisation", { description: "Réessayez." }),
    });

  return (
    <div>
      <VersionBar
        version={version}
        onReset={reset}
        onSave={save}
        saving={saveMutation.isPending}
        resetting={resetMutation.isPending}
      />
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={f.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Libellé
                </Label>
                <Input
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="h-9 bg-background/60"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Groupe
                </Label>
                <Input
                  value={f.group}
                  onChange={(e) => update(i, { group: e.target.value })}
                  className="h-9 bg-background/60"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Code
                </Label>
                <Input
                  value={f.code ?? ""}
                  onChange={(e) => update(i, { code: e.target.value || null })}
                  placeholder="MAINT/EN/…"
                  className="h-9 bg-background/60"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Segmentation
                </Label>
                <Select
                  value={f.segmentation}
                  onValueChange={(v) => update(i, { segmentation: v as SegmentationKind })}
                >
                  <SelectTrigger className="h-9 bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linéaire (1/3 · 2/3 · 3/3)</SelectItem>
                    <SelectItem value="single">Segment unique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Catégories de contrôle
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {FAMILY_IDS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(i, cat)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                        f.categories.includes(cat)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => removeFiche(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              </div>
            </div>
            {!f.confirmed && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-warning">
                <Info className="h-3 w-3" /> Entrée non confirmée dans les données existantes — à
                valider par les superviseurs.
              </p>
            )}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={addFiche}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une fiche
      </Button>
    </div>
  );
}

function FicheCatalogTab() {
  const { data: res, isLoading, isError } = useDictionary<FicheType[]>("fiche-catalog");
  if (isLoading) return <LoadingCard />;
  if (isError || !res) return <ErrorCard />;
  return <FicheCatalogEditor initial={res.data} version={res.version} />;
}

/* ---------- Onglet 2 : familles / types de dégradation ---------- */

function FamiliesEditor({
  initial,
  version: initialVersion,
}: {
  initial: Family[];
  version: number;
}) {
  const [items, setItems] = useState<Family[]>(initial);
  const [version, setVersion] = useState(initialVersion);
  const saveMutation = useSaveDictionary<Family[]>("families");
  const resetMutation = useResetDictionary<Family[]>("families");

  const update = (i: number, patch: Partial<Family>) =>
    setItems((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFamily = () =>
    setItems((arr) => [
      ...arr,
      { id: `famille-${Date.now()}`, label: "Nouvelle famille", hint: "", segments: [] },
    ]);
  const removeFamily = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const save = () =>
    saveMutation.mutate(items, {
      onSuccess: (res) => {
        setVersion(res.version);
        toast.success("Familles enregistrées", {
          description: `Nouvelle version : ${res.version}.`,
        });
      },
      onError: () => toast.error("Échec de l'enregistrement", { description: "Réessayez." }),
    });
  const reset = () =>
    resetMutation.mutate(undefined, {
      onSuccess: (res) => {
        setItems(res.data);
        setVersion(res.version);
        toast.success("Familles réinitialisées aux valeurs par défaut");
      },
      onError: () => toast.error("Échec de la réinitialisation", { description: "Réessayez." }),
    });

  return (
    <div>
      <VersionBar
        version={version}
        onReset={reset}
        onSave={save}
        saving={saveMutation.isPending}
        resetting={resetMutation.isPending}
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Un bloc par segment : première ligne = libellé du segment, lignes suivantes « - point » =
        types de dégradation contrôlés.
      </p>
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={f.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Libellé de la famille
                </Label>
                <Input
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="h-9 bg-background/60"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Indice / description courte
                </Label>
                <Input
                  value={f.hint ?? ""}
                  onChange={(e) => update(i, { hint: e.target.value })}
                  className="h-9 bg-background/60"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Segments et points de contrôle
                </Label>
                <Textarea
                  value={segmentsToText(f.segments)}
                  onChange={(e) => update(i, { segments: textToSegments(f.id, e.target.value) })}
                  rows={6}
                  className="bg-background/60 font-mono text-xs"
                />
              </div>
              <div className="flex justify-end md:col-span-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => removeFamily(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer la famille
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={addFamily}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une famille
      </Button>
    </div>
  );
}

function FamiliesTab() {
  const { data: res, isLoading, isError } = useDictionary<Family[]>("families");
  if (isLoading) return <LoadingCard />;
  if (isError || !res) return <ErrorCard />;
  return <FamiliesEditor initial={res.data} version={res.version} />;
}

/* ---------- Onglet 3 : checklist bâtiment A→H ---------- */

function BuildingEditor({
  initial,
  version: initialVersion,
}: {
  initial: BuildingCategory[];
  version: number;
}) {
  const [items, setItems] = useState<BuildingCategory[]>(initial);
  const [version, setVersion] = useState(initialVersion);
  const saveMutation = useSaveDictionary<BuildingCategory[]>("building-categories");
  const resetMutation = useResetDictionary<BuildingCategory[]>("building-categories");

  const update = (i: number, patch: Partial<BuildingCategory>) =>
    setItems((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const addCategory = () =>
    setItems((arr) => [
      ...arr,
      { id: `cat-${Date.now()}`, code: "?", label: "Nouvelle catégorie", items: [] },
    ]);
  const removeCategory = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const save = () =>
    saveMutation.mutate(items, {
      onSuccess: (res) => {
        setVersion(res.version);
        toast.success("Checklist bâtiment enregistrée", {
          description: `Nouvelle version : ${res.version}.`,
        });
      },
      onError: () => toast.error("Échec de l'enregistrement", { description: "Réessayez." }),
    });
  const reset = () =>
    resetMutation.mutate(undefined, {
      onSuccess: (res) => {
        setItems(res.data);
        setVersion(res.version);
        toast.success("Checklist bâtiment réinitialisée aux valeurs par défaut");
      },
      onError: () => toast.error("Échec de la réinitialisation", { description: "Réessayez." }),
    });

  return (
    <div>
      <VersionBar
        version={version}
        onReset={reset}
        onSave={save}
        saving={saveMutation.isPending}
        resetting={resetMutation.isPending}
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Un item par ligne. L'ordre et la lettre de catégorie (A→H) sont libres mais doivent rester
        cohérents avec le cahier des charges.
      </p>
      <div className="space-y-3">
        {items.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <div>
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Lettre
                </Label>
                <Input
                  value={c.code}
                  onChange={(e) => update(i, { code: e.target.value })}
                  className="h-9 bg-background/60"
                  maxLength={2}
                />
              </div>
              <div className="md:col-span-3">
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Libellé
                </Label>
                <Input
                  value={c.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="h-9 bg-background/60"
                />
              </div>
              <div className="flex items-end justify-end md:col-span-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => removeCategory(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              </div>
              <div className="md:col-span-6">
                <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
                  Items ({c.items.length})
                </Label>
                <Textarea
                  value={itemsToText(c.items)}
                  onChange={(e) => update(i, { items: textToItems(c.id, e.target.value) })}
                  rows={5}
                  className="bg-background/60 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={addCategory}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une catégorie
      </Button>
    </div>
  );
}

function BuildingTab() {
  const {
    data: res,
    isLoading,
    isError,
  } = useDictionary<BuildingCategory[]>("building-categories");
  if (isLoading) return <LoadingCard />;
  if (isError || !res) return <ErrorCard />;
  return <BuildingEditor initial={res.data} version={res.version} />;
}

/* ---------- Page ---------- */

function ModelsPage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Administration"
        title="Modèles de formulaires"
        subtitle="Dictionnaire des fiches — familles, types de fiche, checklist bâtiment"
      />
      <div className="p-6 md:p-8">
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Les modifications prennent effet immédiatement, sans redéploiement. Une fiche déjà soumise
          n'est pas altérée rétroactivement : elle conserve la version du modèle en vigueur au
          moment de sa soumission.
        </div>

        <Tabs defaultValue="fiches">
          <TabsList>
            <TabsTrigger value="fiches">Types de fiche</TabsTrigger>
            <TabsTrigger value="familles">Familles / dégradations</TabsTrigger>
            <TabsTrigger value="batiment">Checklist bâtiment A→H</TabsTrigger>
          </TabsList>
          <TabsContent value="fiches" className="mt-4">
            <FicheCatalogTab />
          </TabsContent>
          <TabsContent value="familles" className="mt-4">
            <FamiliesTab />
          </TabsContent>
          <TabsContent value="batiment" className="mt-4">
            <BuildingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
