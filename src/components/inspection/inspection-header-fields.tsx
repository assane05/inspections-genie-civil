import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePatchInspectionHeader, type Inspection } from "@/lib/queries/inspections";

export function InspectionHeaderFields({
  inspection,
  disabled,
}: {
  inspection: Inspection;
  disabled?: boolean;
}) {
  const patchHeader = usePatchInspectionHeader(inspection.id);
  const [comment, setComment] = useState(inspection.headerComment ?? "");

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Secteur
          </Label>
          <Select
            value={inspection.sector ?? undefined}
            disabled={disabled}
            onValueChange={(v) => patchHeader.mutate({ sector: v as "landside" | "airside" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landside">Landside</SelectItem>
              <SelectItem value="airside">Airside</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Conformité
          </Label>
          <Select
            value={inspection.acceptance ?? undefined}
            disabled={disabled}
            onValueChange={(v) =>
              patchHeader.mutate({ acceptance: v as "conforme" | "non_conforme" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conforme">Conforme</SelectItem>
              <SelectItem value="non_conforme">Non conforme</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
            Commentaire général
          </Label>
          <Textarea
            value={comment}
            disabled={disabled}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => {
              if (comment !== (inspection.headerComment ?? "")) {
                patchHeader.mutate({ headerComment: comment || null });
              }
            }}
            placeholder="Observations générales sur le bâtiment…"
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );
}
