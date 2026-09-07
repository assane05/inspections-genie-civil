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
  verifie: { label: "Vérifiée", className: "bg-primary/15 text-primary border-primary/30" },
  rejete: {
    label: "Rejetée",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

/**
 * Vue lecture seule d'une fiche déjà soumise — utilisée par l'admin
 * ("Fiches soumises" → détail + validation) et par le superviseur
 * ("Mes fiches" → consultation, sans les boutons de validation).
 */
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

  if (inspectionQuery.isLoading || schemaQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }
  if (!inspectionQuery.data || !schemaQuery.data) {
    return <p className="text-sm text-destructive">Impossible de charger cette fiche.</p>;
  }

  const inspection = inspectionQuery.data;
  const schema = schemaQuery.data;
  const badge = STATUS_BADGE[inspection.status] ?? STATUS_BADGE.soumis;
  const canAct = canValidate && inspection.status === "soumis";

  const valueFor = (itemId: string, segmentId: string | null) =>
    inspection.values.find((v) => v.itemId === itemId && v.segmentId === segmentId);

  return (
    <div className="space-y-5">
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
              Motif du rejet : {inspection.rejectionReason}
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

      {schema.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="mb-3 text-sm font-semibold">
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
                  <p className="mb-1 text-sm font-medium">{item.label}</p>
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
                            {STATE_LABELS[state]}
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

      {canAct && (
        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={() => setRejectOpen(true)}
          >
            <XIcon className="h-4 w-4" /> Rejeter
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
            <Check className="h-4 w-4" /> Vérifier
          </Button>
        </div>
      )}

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
