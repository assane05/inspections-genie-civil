import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { InspectionReadOnlyView } from "@/components/inspection/inspection-read-only-view";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/inspections/$id")({
  component: InspectionDetail,
  head: () => ({
    meta: [{ title: "Détail de la fiche — LAS Inspections" }],
  }),
});

function InspectionDetail() {
  const { id } = useParams({ from: "/inspections/$id" });
  const { user } = useAuth();
  const canValidate = user?.role === "admin";

  return (
    <div>
      <PageHeader
        eyebrow="Fiches soumises"
        title="Détail de la fiche"
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/inspections">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour à la liste
            </Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-6 md:px-8">
        <InspectionReadOnlyView inspectionId={id} canValidate={canValidate} />
      </div>
    </div>
  );
}
