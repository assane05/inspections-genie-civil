import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InspectionValueControl } from "@/components/inspection/inspection-value-control";
import { MarkAllRasButton } from "@/components/inspection/mark-all-ras-button";
import type {
  FormSchemaSection,
  FormSchemaSegment,
  InspectionValue,
  ValueUpsertInput,
} from "@/lib/queries/inspections";

export function InspectionSection({
  inspectionId,
  section,
  segments,
  values,
  onValueChange,
  disabled,
}: {
  inspectionId: string;
  section: FormSchemaSection;
  segments: FormSchemaSegment[];
  values: InspectionValue[];
  onValueChange: (input: ValueUpsertInput) => void;
  disabled?: boolean;
}) {
  const valueFor = useMemo(() => {
    const map = new Map<string, InspectionValue>();
    for (const v of values) map.set(`${v.itemId}:${v.segmentId ?? ""}`, v);
    return (itemId: string, segmentId: string | null) => map.get(`${itemId}:${segmentId ?? ""}`);
  }, [values]);

  const defectCount = values.filter(
    (v) =>
      section.items.some((i) => i.id === v.itemId) && (v.state === "minor" || v.state === "major"),
  ).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          {section.code ? `${section.code} — ${section.label}` : section.label}
          {defectCount > 0 && <Badge variant="destructive">{defectCount} défaut(s)</Badge>}
        </CardTitle>
        <MarkAllRasButton
          inspectionId={inspectionId}
          sectionId={section.id}
          sectionLabel={section.label}
          disabled={disabled}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {section.items.map((item) => (
          <div key={item.id} className="space-y-2">
            {segments.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {segments.map((segment) => (
                  <InspectionValueControl
                    key={segment.id}
                    inspectionId={inspectionId}
                    itemLabel={item.label}
                    segmentLabel={segment.label}
                    value={valueFor(item.id, segment.id)}
                    disabled={disabled}
                    onChange={(patch) =>
                      onValueChange({ itemId: item.id, segmentId: segment.id, ...patch })
                    }
                  />
                ))}
              </div>
            ) : (
              <InspectionValueControl
                inspectionId={inspectionId}
                itemLabel={item.label}
                value={valueFor(item.id, null)}
                disabled={disabled}
                onChange={(patch) => onValueChange({ itemId: item.id, segmentId: null, ...patch })}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
