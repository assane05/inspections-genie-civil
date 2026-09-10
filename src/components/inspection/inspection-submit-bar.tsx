// import { useEffect, useState } from "react";
// import { Loader2, Send } from "lucide-react";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import { ApiError } from "@/lib/api-client";
// import { flushQueue, readQueue, subscribeQueue } from "@/lib/offline-queue";
// import { useSubmitInspection, type Inspection } from "@/lib/queries/inspections";

// export function InspectionSubmitBar({
//   inspection,
//   onSubmitted,
// }: {
//   inspection: Inspection;
//   onSubmitted?: () => void;
// }) {
//   const submit = useSubmitInspection(inspection.id);
//   const [pendingCount, setPendingCount] = useState(0);
//   const [flushing, setFlushing] = useState(false);

//   const scopePrefix = `/api/inspections/${inspection.id}/`;
//   const countForThisInspection = (queue: ReturnType<typeof readQueue>) =>
//     queue.filter((q) => q.endpoint.includes(scopePrefix)).length;

//   useEffect(() => {
//     setPendingCount(countForThisInspection(readQueue()));
//     const unsubscribe = subscribeQueue((queue) => setPendingCount(countForThisInspection(queue)));
//     return () => {
//       unsubscribe();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [inspection.id]);

//   if (inspection.status !== "non_soumis") {
//     return (
//       <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
//         Fiche déjà soumise
//         {inspection.submittedAt
//           ? ` le ${new Date(inspection.submittedAt).toLocaleString("fr-FR")}`
//           : ""}
//         .
//       </div>
//     );
//   }

//   async function handleSubmit() {
//     if (pendingCount > 0) {
//       setFlushing(true);
//       await flushQueue();
//       setFlushing(false);
//       const stillPending = countForThisInspection(readQueue());
//       if (stillPending > 0) {
//         toast.error("Synchronisation incomplète", {
//           description: `${stillPending} élément(s) (photos ou constats) pas encore envoyé(s) — reconnectez-vous avant de soumettre.`,
//         });
//         return;
//       }
//     }

//     submit.mutate(undefined, {
//       onSuccess: () => {
//         toast.success("Fiche soumise");
//         onSubmitted?.();
//       },
//       onError: (err) => {
//         if (err instanceof ApiError && err.status === 422) {
//           toast.error("Défauts incomplets", {
//             description: "Un ou plusieurs défauts n'ont pas de sévérité renseignée.",
//           });
//           return;
//         }
//         if (err instanceof ApiError && err.status === 409) {
//           toast.error("Déjà soumise");
//           return;
//         }
//         toast.error("Échec de la soumission", { description: "Réessayez." });
//       },
//     });
//   }

//   return (
//     <div className="flex items-center justify-end gap-3">
//       {pendingCount > 0 && (
//         <p className="text-xs text-muted-foreground">
//           {pendingCount} élément(s) en attente de synchronisation
//         </p>
//       )}
//       <Button
//         type="button"
//         className="gap-1.5"
//         disabled={submit.isPending || flushing}
//         onClick={() => void handleSubmit()}
//       >
//         {flushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
//         Soumettre la fiche
//       </Button>
//     </div>
//   );
// }

import { useEffect, useState } from "react";

import { CheckCircle2, Loader2, Send } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { ApiError } from "@/lib/api-client";

import { flushQueue, readQueue, subscribeQueue } from "@/lib/offline-queue";

import { useSubmitInspection, type Inspection } from "@/lib/queries/inspections";

export function InspectionSubmitBar({
  inspection,
  onSubmitted,
  canSubmit = false,
  completedSections = 0,
  totalSections = 0,
}: {
  inspection: Inspection;
  onSubmitted?: () => void;

  /**
   * true uniquement lorsque toutes les familles
   * sont complètes.
   */
  canSubmit?: boolean;

  /**
   * Nombre de familles complétées.
   */
  completedSections?: number;

  /**
   * Nombre total de familles.
   */
  totalSections?: number;
}) {
  const submit = useSubmitInspection(inspection.id);

  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const scopePrefix = `/api/inspections/${inspection.id}/`;

  /*
   * ------------------------------------------------------------
   * FILE D'ATTENTE HORS-LIGNE
   * ------------------------------------------------------------
   */

  const countForThisInspection = (queue: ReturnType<typeof readQueue>) => {
    return queue.filter((q) => q.endpoint.includes(scopePrefix)).length;
  };

  useEffect(() => {
    setPendingCount(countForThisInspection(readQueue()));

    const unsubscribe = subscribeQueue((queue) => {
      setPendingCount(countForThisInspection(queue));
    });

    return () => {
      unsubscribe();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection.id]);

  /*
   * ------------------------------------------------------------
   * FICHE DÉJÀ SOUMISE
   * ------------------------------------------------------------
   */

  if (inspection.status !== "non_soumis") {
    return (
      <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />

          <span>
            Fiche déjà soumise
            {inspection.submittedAt
              ? ` le ${new Date(inspection.submittedAt).toLocaleString("fr-FR")}`
              : ""}
            .
          </span>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * SOUMISSION
   * ------------------------------------------------------------
   */

  async function handleSubmit() {
    /*
     * Double sécurité côté frontend.
     */

    if (!canSubmit) {
      toast.error("Fiche incomplète", {
        description: "Veuillez compléter toutes les familles avant de soumettre la fiche.",
      });

      return;
    }

    /*
     * ----------------------------------------------------------
     * SYNCHRONISATION HORS-LIGNE
     * ----------------------------------------------------------
     */

    if (pendingCount > 0) {
      setFlushing(true);

      try {
        await flushQueue();
      } finally {
        setFlushing(false);
      }

      const stillPending = countForThisInspection(readQueue());

      setPendingCount(stillPending);

      if (stillPending > 0) {
        toast.error("Synchronisation incomplète", {
          description: `${stillPending} élément(s) ne sont pas encore synchronisés. Reconnectez-vous avant de soumettre.`,
        });

        return;
      }
    }

    /*
     * ----------------------------------------------------------
     * SOUMISSION BACKEND
     * ----------------------------------------------------------
     */

    submit.mutate(undefined, {
      onSuccess: () => {
        toast.success("Fiche soumise", {
          description: "L'inspection a été soumise avec succès.",
        });

        onSubmitted?.();
      },

      onError: (err) => {
        /*
         * Défauts incomplets.
         */

        if (err instanceof ApiError && err.status === 422) {
          toast.error("Défauts incomplets", {
            description: "Un ou plusieurs défauts n'ont pas de sévérité renseignée.",
          });

          return;
        }

        /*
         * Inspection déjà soumise.
         */

        if (err instanceof ApiError && err.status === 409) {
          toast.error("Déjà soumise");

          return;
        }

        /*
         * Erreur générale.
         */

        toast.error("Échec de la soumission", {
          description: "Réessayez.",
        });
      },
    });
  }

  /*
   * ------------------------------------------------------------
   * AFFICHAGE
   * ------------------------------------------------------------
   */

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">État de l'inspection</p>

          <p className="mt-1 text-xs text-muted-foreground">
            {completedSections} / {totalSections} famille
            {totalSections > 1 ? "s" : ""} complétée
            {completedSections > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!canSubmit && (
            <p className="text-right text-xs text-muted-foreground">
              Complétez toutes les familles avant de soumettre.
            </p>
          )}

          {pendingCount > 0 && (
            <p className="text-right text-xs text-muted-foreground">
              {pendingCount} élément
              {pendingCount > 1 ? "s" : ""} en attente de synchronisation
            </p>
          )}

          <Button
            type="button"
            className="gap-1.5"
            disabled={!canSubmit || submit.isPending || flushing || pendingCount > 0}
            onClick={() => void handleSubmit()}
          >
            {flushing || submit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}

            {flushing
              ? "Synchronisation…"
              : submit.isPending
                ? "Soumission…"
                : "Soumettre la fiche"}
          </Button>
        </div>
      </div>
    </div>
  );
}
