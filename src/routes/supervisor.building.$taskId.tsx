import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { InspectionForm } from "@/components/inspection/inspection-form";

export const Route = createFileRoute("/supervisor/building/$taskId")({
  component: BuildingTaskForm,
  head: () => ({
    meta: [
      { title: "Fiche d'inspection Bâtiment — LAS Superviseur" },
      {
        name: "description",
        content: "Inspection bâtiment : catégories A→H, saisie par exception.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Fiche bâtiment — réécrite sur le schéma v1.1 / Epic 3.
 * Même composant InspectionForm que la fiche horizontale : le module
 * (horizontal/vertical) et donc l'absence de segments est déterminé par le
 * schéma renvoyé par GET /api/form-types/:id/schema, pas par cet écran.
 */
function BuildingTaskForm() {
  const { taskId: assignmentId } = useParams({ from: "/supervisor/building/$taskId" });
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow="Fiche bâtiment"
        title="Inspection"
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/supervisor/tasks">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux tâches
            </Link>
          </Button>
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-6 md:px-8">
        <InspectionForm
          assignmentId={assignmentId}
          onSubmitted={() => navigate({ to: "/supervisor/tasks" })}
        />
      </div>
    </div>
  );
}
