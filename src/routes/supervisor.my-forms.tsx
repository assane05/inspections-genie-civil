import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useSubmittedInspections,
  type SubmittedInspectionFilters,
} from "@/lib/queries/inspections";

export const Route = createFileRoute("/supervisor/my-forms")({
  component: MyForms,
  head: () => ({
    meta: [{ title: "Mes fiches — LAS Superviseur" }],
  }),
});

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

function MyForms() {
  // Le back scope automatiquement aux fiches soumises par l'utilisateur
  // connecté quand ce n'est pas un admin/approbateur — aucun filtre de
  // groupe/personne nécessaire ici.
  const [filters] = useState<SubmittedInspectionFilters>({ status: "all" });
  const { data: inspections = [], isLoading, isError } = useSubmittedInspections(filters);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Superviseur"
        title="Mes fiches"
        subtitle="Historique de vos fiches soumises et leur statut de validation"
      />
      <div className="p-6 md:p-8">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="pl-5">Formulaire</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Date de soumission</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Chargement…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">
                    Impossible de charger vos fiches.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && inspections.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune fiche soumise pour l'instant.
                  </TableCell>
                </TableRow>
              )}
              {inspections.map((insp) => {
                const badge = STATUS_BADGE[insp.status] ?? STATUS_BADGE.soumis;
                return (
                  <TableRow key={insp.id} className="border-border/40">
                    <TableCell className="pl-5 font-medium">
                      <Link
                        to="/inspections/$id"
                        params={{ id: insp.id }}
                        className="hover:underline"
                      >
                        {insp.formType.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{insp.assignment?.zoneNotes ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {insp.submittedAt ? new Date(insp.submittedAt).toLocaleString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                      {insp.status === "rejete" && insp.rejectionReason && (
                        <p className="mt-1 text-xs text-destructive">{insp.rejectionReason}</p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
