import { useEffect, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useFormTypeSchema,
  useInspection,
  useResumeInspection,
  usePatchInspectionValues,
  type ValueUpsertInput,
} from "@/lib/queries/inspections";
import { exportInspectionPdf } from "@/lib/inspection-pdf";
import { InspectionSection } from "@/components/inspection/inspection-section";
import { InspectionHeaderFields } from "@/components/inspection/inspection-header-fields";
import { InspectionSubmitBar } from "@/components/inspection/inspection-submit-bar";
import { Button } from "@/components/ui/button";

/**
 * Point d'entrée : à partir d'une assignation (assignmentId), résout
 * l'inspection associée (création idempotente si première visite — reprise
 * de brouillon sinon), charge le schéma de la fiche et l'état courant des
 * constats, puis rend une section par famille/catégorie.
 */
export function InspectionForm({
  assignmentId,
  onSubmitted,
}: {
  assignmentId: string;
  onSubmitted?: () => void;
}) {
  const resumeInspection = useResumeInspection();
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    setInspectionId(null);
    resumeInspection.mutate(assignmentId, {
      onSuccess: (inspection) => setInspectionId(inspection.id),
      onError: () => toast.error("Impossible d'ouvrir la fiche", { description: "Réessayez." }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const inspectionQuery = useInspection(inspectionId ?? undefined);
  const schemaQuery = useFormTypeSchema(inspectionQuery.data?.formTypeId);
  const patchValues = usePatchInspectionValues(inspectionId ?? "");

  if (
    resumeInspection.isPending ||
    !inspectionId ||
    inspectionQuery.isLoading ||
    schemaQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la fiche…
      </div>
    );
  }

  if (!inspectionQuery.data || !schemaQuery.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Impossible de charger cette fiche.
      </div>
    );
  }

  const inspection = inspectionQuery.data;
  const schema = schemaQuery.data;
  const isSubmitted = inspection.status !== "non_soumis";

  function handleValueChange(input: ValueUpsertInput) {
    patchValues.mutate([input], {
      onError: () =>
        toast.error("Enregistrement en attente", {
          description: "Sera synchronisé automatiquement dès le retour du réseau.",
        }),
    });
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      await exportInspectionPdf(inspection, schema);
    } catch {
      toast.error("Échec de l'export PDF", { description: "Réessayez." });
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{schema.name}</h2>
          <p className="text-sm text-muted-foreground">
            Version {schema.version} · {schema.sections.length} famille(s)
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exportingPdf}
          onClick={() => void handleExportPdf()}
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Export PDF
        </Button>
      </div>

      {schema.module === "vertical" && (
        <InspectionHeaderFields inspection={inspection} disabled={isSubmitted} />
      )}

      {schema.sections.map((section) => (
        <InspectionSection
          key={section.id}
          inspectionId={inspection.id}
          section={section}
          segments={schema.segments}
          values={inspection.values.filter((v) => section.items.some((i) => i.id === v.itemId))}
          onValueChange={handleValueChange}
          disabled={isSubmitted}
        />
      ))}

      <InspectionSubmitBar inspection={inspection} onSubmitted={onSubmitted} />
    </div>
  );
}
