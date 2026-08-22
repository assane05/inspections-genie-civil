import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  useCatalogFormTypes,
  useCatalogFormTypeSchema,
  useCreateFormType,
  usePatchFormType,
  useDeleteFormType,
  useCreateSection,
  usePatchSection,
  useDeleteSection,
  useCreateItem,
  usePatchItem,
  useDeleteItem,
  useCreateSegment,
  usePatchSegment,
  useDeleteSegment,
  type CatalogFormType,
} from "@/lib/queries/catalog";

export const Route = createFileRoute("/models")({
  component: ModelsPage,
  head: () => ({
    meta: [
      { title: "Catalogue de fiches — LAS Inspections" },
      {
        name: "description",
        content: "Gestion des fiches d'inspection, familles/catégories, items et segments.",
      },
    ],
  }),
});

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  return fallback;
}

function ModelsPage() {
  const { data: formTypes = [], isLoading, isError } = useCatalogFormTypes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const horizontal = useMemo(() => formTypes.filter((f) => f.module === "horizontal"), [formTypes]);
  const vertical = useMemo(() => formTypes.filter((f) => f.module === "vertical"), [formTypes]);

  const createFormType = useCreateFormType();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Administration"
        title="Catalogue de fiches"
        subtitle="Fiches d'inspection, familles/catégories, items de contrôle et segments"
        actions={
          <Button size="sm" className="gap-2" onClick={() => setShowCreate((s) => !s)}>
            <Plus className="h-4 w-4" /> Nouvelle fiche
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[280px_1fr] md:p-8">
        <div className="space-y-4">
          {showCreate && (
            <CreateFormTypeCard
              onCreate={(input) =>
                createFormType.mutate(input, {
                  onSuccess: (created) => {
                    toast.success("Fiche créée");
                    setSelectedId(created.id);
                    setShowCreate(false);
                  },
                  onError: (err) =>
                    toast.error("Échec de la création", {
                      description: describeError(err, "Réessayez."),
                    }),
                })
              }
              pending={createFormType.isPending}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">Impossible de charger le catalogue.</p>
          )}

          <FormTypeList
            title="Horizontal"
            items={horizontal}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <FormTypeList
            title="Bâtiment"
            items={vertical}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div>
          {selectedId ? (
            <FormTypeEditor formTypeId={selectedId} onDeleted={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
              Sélectionnez une fiche à gauche pour l'éditer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormTypeList({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: CatalogFormType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              selectedId === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-card/40 hover:border-primary/40",
              !f.isActive && "opacity-50",
            )}
          >
            <span className="truncate">{f.name}</span>
            {!f.isActive && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                inactive
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateFormTypeCard({
  onCreate,
  onCancel,
  pending,
}: {
  onCreate: (input: { code: string; name: string; module: "horizontal" | "vertical" }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [module, setModule] = useState<"horizontal" | "vertical">("horizontal");

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div>
        <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
          Code (unique)
        </Label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="taxiway" />
      </div>
      <div>
        <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
          Nom
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fiche d'inspection Taxiway"
        />
      </div>
      <div>
        <Label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
          Module
        </Label>
        <Select value={module} onValueChange={(v) => setModule(v as typeof module)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal</SelectItem>
            <SelectItem value="vertical">Bâtiment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="sm"
          disabled={pending || !code.trim() || !name.trim()}
          onClick={() => onCreate({ code: code.trim(), name: name.trim(), module })}
        >
          Créer
        </Button>
      </div>
    </div>
  );
}

function FormTypeEditor({ formTypeId, onDeleted }: { formTypeId: string; onDeleted: () => void }) {
  const { data: schema, isLoading } = useCatalogFormTypeSchema(formTypeId);
  const { data: formTypes = [] } = useCatalogFormTypes();
  const meta = formTypes.find((f) => f.id === formTypeId);

  const patchFormType = usePatchFormType();
  const deleteFormType = useDeleteFormType();
  const createSection = useCreateSection(formTypeId);
  const patchSection = usePatchSection(formTypeId);
  const deleteSection = useDeleteSection(formTypeId);
  const createItem = useCreateItem(formTypeId);
  const patchItem = usePatchItem(formTypeId);
  const deleteItem = useDeleteItem(formTypeId);
  const createSegment = useCreateSegment(formTypeId);
  const patchSegment = usePatchSegment(formTypeId);
  const deleteSegment = useDeleteSegment(formTypeId);

  const [newItemBySection, setNewItemBySection] = useState<Record<string, string>>({});
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSegmentLabel, setNewSegmentLabel] = useState("");

  if (isLoading || !schema || !meta) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la fiche…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            defaultValue={meta.name}
            onBlur={(e) => {
              if (e.target.value !== meta.name && e.target.value.trim()) {
                patchFormType.mutate(
                  { id: formTypeId, name: e.target.value.trim() },
                  {
                    onError: (err) =>
                      toast.error("Échec", { description: describeError(err, "Réessayez.") }),
                  },
                );
              }
            }}
            className="h-9 max-w-md font-medium"
          />
          <p className="text-xs text-muted-foreground">
            {meta.code} · v{meta.version} ·{" "}
            {meta.module === "horizontal" ? "Horizontal" : "Bâtiment"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={meta.isActive}
              onCheckedChange={(checked) =>
                patchFormType.mutate(
                  { id: formTypeId, isActive: checked },
                  {
                    onError: (err) =>
                      toast.error("Échec", { description: describeError(err, "Réessayez.") }),
                  },
                )
              }
            />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() =>
              deleteFormType.mutate(formTypeId, {
                onSuccess: () => {
                  toast.success("Fiche supprimée");
                  onDeleted();
                },
                onError: (err) =>
                  toast.error("Suppression impossible", {
                    description: describeError(err, "Réessayez."),
                  }),
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Familles / catégories ({schema.sections.length})
        </h3>
        <Accordion type="multiple" className="space-y-2">
          {schema.sections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="rounded-lg border border-border/60 bg-card/40 px-3"
            >
              <div className="flex items-center gap-2">
                <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                  <Input
                    defaultValue={section.label}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      if (e.target.value !== section.label && e.target.value.trim()) {
                        patchSection.mutate({ id: section.id, label: e.target.value.trim() });
                      }
                    }}
                    className="h-8 max-w-sm"
                  />
                </AccordionTrigger>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    deleteSection.mutate(section.id, {
                      onError: (err) =>
                        toast.error("Suppression impossible", {
                          description: describeError(err, "Réessayez."),
                        }),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <AccordionContent className="space-y-2 pb-3">
                {section.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      defaultValue={item.label}
                      onBlur={(e) => {
                        if (e.target.value !== item.label && e.target.value.trim()) {
                          patchItem.mutate({ id: item.id, label: e.target.value.trim() });
                        }
                      }}
                      className="h-8"
                    />
                    <button
                      type="button"
                      onClick={() => deleteItem.mutate(item.id)}
                      aria-label="Supprimer l'item"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newItemBySection[section.id] ?? ""}
                    onChange={(e) =>
                      setNewItemBySection((s) => ({ ...s, [section.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      const label = (newItemBySection[section.id] ?? "").trim();
                      if (e.key === "Enter" && label) {
                        e.preventDefault();
                        createItem.mutate(
                          { sectionId: section.id, label },
                          {
                            onSuccess: () =>
                              setNewItemBySection((s) => ({ ...s, [section.id]: "" })),
                          },
                        );
                      }
                    }}
                    placeholder="Ajouter un item (Entrée)"
                    className="h-8"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-3 flex gap-2">
          <Input
            value={newSectionLabel}
            onChange={(e) => setNewSectionLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSectionLabel.trim()) {
                e.preventDefault();
                createSection.mutate(
                  { label: newSectionLabel.trim() },
                  { onSuccess: () => setNewSectionLabel("") },
                );
              }
            }}
            placeholder="Ajouter une famille/catégorie (Entrée)"
            className="h-9"
          />
        </div>
      </div>

      {schema.module === "horizontal" && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Segments ({schema.segments.length})</h3>
          <div className="space-y-2">
            {schema.segments.map((segment) => (
              <div key={segment.id} className="flex items-center gap-2">
                <Input
                  defaultValue={segment.label}
                  onBlur={(e) => {
                    if (e.target.value !== segment.label && e.target.value.trim()) {
                      patchSegment.mutate({ id: segment.id, label: e.target.value.trim() });
                    }
                  }}
                  className="h-8"
                />
                <button
                  type="button"
                  onClick={() => deleteSegment.mutate(segment.id)}
                  aria-label="Supprimer le segment"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Input
              value={newSegmentLabel}
              onChange={(e) => setNewSegmentLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSegmentLabel.trim()) {
                  e.preventDefault();
                  createSegment.mutate(newSegmentLabel.trim(), {
                    onSuccess: () => setNewSegmentLabel(""),
                  });
                }
              }}
              placeholder="Ajouter un segment (Entrée)"
              className="h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
}
