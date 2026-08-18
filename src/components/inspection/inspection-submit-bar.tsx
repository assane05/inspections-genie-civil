import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { useSubmitInspection, type Inspection } from "@/lib/queries/inspections";

export function InspectionSubmitBar({
  inspection,
  onSubmitted,
}: {
  inspection: Inspection;
  onSubmitted?: () => void;
}) {
  const submit = useSubmitInspection(inspection.id);

  if (inspection.status !== "non_soumis") {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Fiche déjà soumise
        {inspection.submittedAt
          ? ` le ${new Date(inspection.submittedAt).toLocaleString("fr-FR")}`
          : ""}
        .
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        className="gap-1.5"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate(undefined, {
            onSuccess: () => {
              toast.success("Fiche soumise");
              onSubmitted?.();
            },
            onError: (err) => {
              if (err instanceof ApiError && err.status === 422) {
                toast.error("Défauts incomplets", {
                  description: "Un ou plusieurs défauts n'ont pas de sévérité renseignée.",
                });
                return;
              }
              if (err instanceof ApiError && err.status === 409) {
                toast.error("Déjà soumise");
                return;
              }
              toast.error("Échec de la soumission", { description: "Réessayez." });
            },
          })
        }
      >
        <Send className="h-4 w-4" />
        Soumettre la fiche
      </Button>
    </div>
  );
}
