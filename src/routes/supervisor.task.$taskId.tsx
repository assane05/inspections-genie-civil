import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { InspectionForm } from "@/components/inspection/inspection-form";

export const Route = createFileRoute("/supervisor/task/$taskId")({
  component: TaskForm,
  head: () => ({
    meta: [
      { title: "Fiche d'inspection — LAS Superviseur" },
      {
        name: "description",
        content:
          "Saisie par segment physique : chaque constat est Non inspecté tant qu'il n'a pas été attesté RAS ou signalé en défaut.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Fiche horizontale — réécrite sur le schéma v1.1 / Epic 3.
 * `taskId` porte désormais l'id de l'assignation (assignmentId) : la
 * résolution/création de l'inspection est gérée par InspectionForm
 * (POST idempotent /api/assignments/:assignmentId/inspection).
 */
function TaskForm() {
  const { taskId: assignmentId } = useParams({ from: "/supervisor/task/$taskId" });
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow="Fiche horizontale"
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
