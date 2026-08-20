import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { flushQueue, readQueue, subscribeQueue } from "@/lib/offline-queue";
import { useSubmitInspection, type Inspection } from "@/lib/queries/inspections";

export function InspectionSubmitBar({
  inspection,
  onSubmitted,
}: {
  inspection: Inspection;
  onSubmitted?: () => void;
}) {
  const submit = useSubmitInspection(inspection.id);
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const scopePrefix = `/api/inspections/${inspection.id}/`;
  const countForThisInspection = (queue: ReturnType<typeof readQueue>) =>
    queue.filter((q) => q.endpoint.includes(scopePrefix)).length;

  useEffect(() => {
    setPendingCount(countForThisInspection(readQueue()));
    const unsubscribe = subscribeQueue((queue) => setPendingCount(countForThisInspection(queue)));
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.id]);

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

  async function handleSubmit() {
    if (pendingCount > 0) {
      setFlushing(true);
      await flushQueue();
      setFlushing(false);
      const stillPending = countForThisInspection(readQueue());
      if (stillPending > 0) {
        toast.error("Synchronisation incomplète", {
          description: `${stillPending} élément(s) (photos ou constats) pas encore envoyé(s) — reconnectez-vous avant de soumettre.`,
        });
        return;
      }
    }

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
    });
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {pendingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {pendingCount} élément(s) en attente de synchronisation
        </p>
      )}
      <Button
        type="button"
        className="gap-1.5"
        disabled={submit.isPending || flushing}
        onClick={() => void handleSubmit()}
      >
        {flushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Soumettre la fiche
      </Button>
    </div>
  );
}
