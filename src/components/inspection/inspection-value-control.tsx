import { useState } from "react";
import { AlertTriangle, Camera, Check, CircleDashed, X } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { compressImage } from "@/lib/image";
import {
  useAddValuePhoto,
  useDeleteValuePhoto,
  useSaveCorrectiveAction,
  useDeleteCorrectiveAction,
  type FindingState,
  type InspectionValue,
  type SeverityLevel,
} from "@/lib/queries/inspections";

const STATE_LABELS: Record<FindingState, string> = {
  non_inspecte: "Non inspecté",
  ras: "RAS",
  minor: "Défaut mineur",
  major: "Défaut majeur",
  yes: "Oui",
  na: "N/A",
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  leger: "Léger",
  moyen: "Moyen",
  eleve: "Élevé",
};

const isDefect = (state: FindingState) => state === "minor" || state === "major";

function StateIcon({ state }: { state: FindingState }) {
  if (state === "ras" || state === "yes") return <Check className="h-3.5 w-3.5 text-emerald-600" />;
  if (isDefect(state)) return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
  return <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />;
}

export type InspectionValueControlProps = {
  inspectionId: string;
  itemLabel: string;
  segmentLabel?: string;
  value: InspectionValue | undefined;
  onChange: (patch: {
    state: FindingState;
    severity?: SeverityLevel | null;
    comment?: string | null;
  }) => void;
  disabled?: boolean;
};

export function InspectionValueControl({
  inspectionId,
  itemLabel,
  segmentLabel,
  value,
  onChange,
  disabled,
}: InspectionValueControlProps) {
  const state = value?.state ?? "non_inspecte";
  const [pendingSeverity, setPendingSeverity] = useState<SeverityLevel | null>(
    value?.severity ?? null,
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const addPhoto = useAddValuePhoto(inspectionId);
  const deletePhoto = useDeleteValuePhoto(inspectionId);
  const saveCorrectiveAction = useSaveCorrectiveAction(inspectionId);
  const deleteCorrectiveAction = useDeleteCorrectiveAction(inspectionId);
  const photos = value?.photos ?? [];
  const correctiveAction = value?.correctiveActions?.[0];
  const [correctiveRef, setCorrectiveRef] = useState(correctiveAction?.reference ?? "");

  const missingSeverity = isDefect(state) && !value?.severity;

  async function handlePhotoSelect(file: File | undefined) {
    if (!file || !value?.id) return;
    try {
      const dataUrl = await compressImage(file);
      addPhoto.mutate(
        { valueId: value.id, dataUrl },
        {
          onSuccess: (result) => {
            if (result.queued) {
              toast("Photo enregistrée hors-ligne", {
                description: "Elle sera envoyée automatiquement dès le retour du réseau.",
              });
            }
          },
          onError: (err) =>
            toast.error("Échec de l'enregistrement de la photo", {
              description: err instanceof Error ? err.message : "Réessayez la prise de vue.",
            }),
        },
      );
    } catch {
      toast.error("Photo illisible", { description: "Réessayez la prise de vue." });
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{itemLabel}</p>
          {segmentLabel && <p className="truncate text-xs text-muted-foreground">{segmentLabel}</p>}
          {missingSeverity && (
            <Badge variant="destructive" className="mt-1 text-[10px]">
              Sévérité requise
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDefect(state) && (
            <Select
              value={pendingSeverity ?? undefined}
              onValueChange={(v) => {
                const severity = v as SeverityLevel;
                setPendingSeverity(severity);
                onChange({ state, severity });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEVERITY_LABELS) as SeverityLevel[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={state}
            onValueChange={(v) => {
              const next = v as FindingState;
              const severity = isDefect(next) ? pendingSeverity : null;
              onChange({ state: next, severity });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <span className="flex items-center gap-1.5">
                <StateIcon state={state} />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATE_LABELS) as FindingState[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isDefect(state) && (
        <div className="flex flex-wrap items-center gap-2 pl-0.5">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative">
              <img
                src={photo.url}
                alt={`Photo ${i + 1} — ${itemLabel}`}
                onClick={() => setLightboxIndex(i)}
                className="h-16 w-16 cursor-pointer rounded-md border object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => deletePhoto.mutate({ valueId: value!.id, photoId: photo.id })}
                  aria-label="Supprimer la photo"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {!disabled && value?.id && (
            <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-muted/50">
              <Camera className="h-4 w-4" />
              <span className="text-[9px] font-medium">Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void handlePhotoSelect(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}

      {isDefect(state) && value?.id && (
        <Input
          value={correctiveRef}
          disabled={disabled}
          placeholder="Action corrective (ex. Ouverture d'une fiche de réparation N°…)"
          className="h-8 text-xs"
          onChange={(e) => setCorrectiveRef(e.target.value)}
          onBlur={() => {
            if (correctiveRef !== (correctiveAction?.reference ?? "")) {
              if (correctiveRef.trim()) {
                saveCorrectiveAction.mutate({ valueId: value.id, reference: correctiveRef });
              } else if (correctiveAction) {
                deleteCorrectiveAction.mutate({ valueId: value.id });
              }
            }
          }}
        />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos.map((p) => p.url)}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
