import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useMarkAllRas } from "@/lib/queries/inspections";

export function MarkAllRasButton({
  inspectionId,
  sectionId,
  sectionLabel,
  disabled,
}: {
  inspectionId: string;
  sectionId: string;
  sectionLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const markAllRas = useMarkAllRas(inspectionId);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={disabled || markAllRas.isPending}
        onClick={() => setOpen(true)}
      >
        <CheckCheck className="h-3.5 w-3.5" />
        Tout RAS
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Attester « {sectionLabel} » RAS</AlertDialogTitle>
            <AlertDialogDescription>
              Passe à « RAS » tous les constats encore non inspectés de cette famille. Les défauts
              déjà saisis ne sont jamais écrasés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                markAllRas.mutate(sectionId, {
                  onSuccess: (r) =>
                    toast.success(`« ${sectionLabel} » attesté RAS`, {
                      description: `${r.valuesTouched} constat(s) mis à jour.`,
                    }),
                  onError: () =>
                    toast.error("Échec de l'attestation", {
                      description: "Réessayez — l'action est sûre à rejouer.",
                    }),
                });
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
