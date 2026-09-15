import { useState } from "react";
import { Loader2, Check, X as XIcon, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useInspection,
  useFormTypeSchema,
  useVerifyInspection,
  useRejectInspection,
} from "@/lib/queries/inspections";
import { exportInspectionPdf } from "@/lib/inspection-pdf";

const STATE_LABELS: Record<string, string> = {
  non_inspecte: "Non inspecté",
  ras: "RAS",
  minor: "Défaut mineur",
  major: "Défaut majeur",
  yes: "Oui",
  na: "N/A",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  soumis: {
    label: "Soumise",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  verifie: {
    label: "Vérifiée",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  rejete: {
    label: "Rejetée",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function InspectionReadOnlyView({
  inspectionId,
  canValidate,
}: {
  inspectionId: string;
  canValidate: boolean;
}) {
  const inspectionQuery = useInspection(inspectionId);

  const schemaQuery = useFormTypeSchema(inspectionQuery.data?.formTypeId);

  const verify = useVerifyInspection(inspectionId);
  const reject = useRejectInspection(inspectionId);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [exporting, setExporting] = useState(false);

  /*
   * ============================================================
   * CHARGEMENT
   * ============================================================
   */

  if (inspectionQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de la fiche…
      </div>
    );
  }

  /*
   * ============================================================
   * ERREUR INSPECTION
   * ============================================================
   */

  if (inspectionQuery.isError) {
    console.error("Erreur GET /api/inspections/:id", inspectionQuery.error);

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="font-semibold text-destructive">Impossible de charger cette fiche.</p>

        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue lors de la récupération de l'inspection.
        </p>

        <pre className="mt-3 overflow-auto rounded-md bg-background p-3 text-xs">
          {inspectionQuery.error instanceof Error
            ? inspectionQuery.error.message
            : String(inspectionQuery.error)}
        </pre>
      </div>
    );
  }

  if (!inspectionQuery.data) {
    return <p className="text-sm text-destructive">Inspection introuvable.</p>;
  }

  /*
   * ============================================================
   * CHARGEMENT DU SCHÉMA
   * ============================================================
   */

  if (schemaQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement du formulaire…
      </div>
    );
  }

  /*
   * ============================================================
   * ERREUR SCHÉMA
   * ============================================================
   */

  if (schemaQuery.isError) {
    console.error("Erreur GET /api/form-types/:id/schema", schemaQuery.error);

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="font-semibold text-destructive">
          La fiche a été trouvée, mais son formulaire ne peut pas être chargé.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Formulaire : {inspectionQuery.data.formTypeId}
        </p>

        <pre className="mt-3 overflow-auto rounded-md bg-background p-3 text-xs">
          {schemaQuery.error instanceof Error
            ? schemaQuery.error.message
            : String(schemaQuery.error)}
        </pre>
      </div>
    );
  }

  if (!schemaQuery.data) {
    return <p className="text-sm text-destructive">Schéma du formulaire introuvable.</p>;
  }

  const inspection = inspectionQuery.data;
  const schema = schemaQuery.data;

  const badge = STATUS_BADGE[inspection.status] ?? STATUS_BADGE.soumis;

  const canAct = canValidate && inspection.status === "soumis";

  const valueFor = (itemId: string, segmentId: string | null) =>
    inspection.values.find((v) => v.itemId === itemId && v.segmentId === segmentId);

  /*
   * ============================================================
   * AFFICHAGE
   * ============================================================
   */

  return (
    <div className="space-y-4">
      {/* EN-TÊTE */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
        <div>
          <h2 className="text-lg font-semibold">{schema.name}</h2>

          <p className="text-sm text-muted-foreground">
            Soumise par {inspection.submittedBy?.displayName ?? "—"}
            {inspection.submittedAt
              ? ` le ${new Date(inspection.submittedAt).toLocaleString("fr-FR")}`
              : ""}
          </p>

          {inspection.status === "verifie" && inspection.verifiedBy && (
            <p className="text-sm text-muted-foreground">
              Vérifiée par {inspection.verifiedBy.displayName}
            </p>
          )}

          {inspection.status === "rejete" && (
            <p className="text-sm text-destructive">
              Motif du rejet : {inspection.rejectionReason ?? "—"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);

              try {
                await exportInspectionPdf(inspection, schema);
              } catch {
                toast.error("Échec de l'export PDF");
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* SECTIONS */}
      {schema.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-md font-semibold">
            {section.code ? `${section.code} — ${section.label}` : section.label}
          </h3>

          <div className="space-y-2">
            {section.items.map((item) => {
              const applicable = schema.segments.filter(
                (s) => !item.excludedSegmentIds.includes(s.id),
              );

              const cells = applicable.length > 0 ? applicable : [null];

              return (
                <div key={item.id}>
                  <p className="mb-1 text-md font-medium">{item.label}</p>

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {cells.map((seg) => {
                      const v = valueFor(item.id, seg?.id ?? null);

                      const state = v?.state ?? "non_inspecte";

                      return (
                        <div
                          key={seg?.id ?? "single"}
                          className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="text-muted-foreground">{seg?.label ?? ""}</span>

                          <span className="font-medium">
                            {STATE_LABELS[state] ?? state}

                            {v?.severity ? ` · ${v.severity}` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ACTIONS ADMIN */}
      {canAct && (
        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={() => setRejectOpen(true)}
          >
            <XIcon className="h-4 w-4" />
            Rejeter
          </Button>

          <Button
            type="button"
            className="gap-1.5"
            disabled={verify.isPending}
            onClick={() =>
              verify.mutate(undefined, {
                onSuccess: () => toast.success("Fiche vérifiée"),
                onError: () => toast.error("Échec de la validation"),
              })
            }
          >
            <Check className="h-4 w-4" />
            Vérifier
          </Button>
        </div>
      )}

      {/* DIALOG REJET */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la fiche</DialogTitle>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motif du rejet (visible par le superviseur)…"
            rows={4}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Annuler
            </Button>

            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || reject.isPending}
              onClick={() =>
                reject.mutate(rejectReason.trim(), {
                  onSuccess: () => {
                    toast.success("Fiche rejetée");
                    setRejectOpen(false);
                  },
                  onError: () => toast.error("Échec du rejet"),
                })
              }
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
