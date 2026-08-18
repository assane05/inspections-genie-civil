import { exportFichePdf, type PdfConstat, type PdfMeta } from "@/lib/pdf-export";
import type {
  FormTypeSchema,
  InspectionValue,
  InspectionWithValues,
} from "@/lib/queries/inspections";

const STATE_LABELS: Record<string, string> = {
  non_inspecte: "Non inspecté",
  ras: "RAS",
  minor: "Défaut mineur",
  major: "Défaut majeur",
  yes: "Oui",
  na: "N/A",
};

const SEVERITY_LABELS: Record<string, string> = {
  leger: "Léger",
  moyen: "Moyen",
  eleve: "Élevé",
};

const STATUS_LABELS: Record<string, string> = {
  non_soumis: "Non soumise",
  soumis: "Soumise",
  verifie: "Vérifiée",
  rejete: "Rejetée",
};

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportInspectionPdf(
  inspection: InspectionWithValues,
  schema: FormTypeSchema,
) {
  const itemLabelById = new Map(
    schema.sections.flatMap((s) => s.items.map((i) => [i.id, i.label] as const)),
  );
  const segmentLabelById = new Map(schema.segments.map((s) => [s.id, s.label] as const));

  const defects = inspection.values.filter((v) => v.state === "minor" || v.state === "major");

  const constats: PdfConstat[] = await Promise.all(
    defects.map(async (v: InspectionValue) => {
      const photos = (await Promise.all(v.photos.map((p) => toDataUrl(p.url)))).filter(
        (p): p is string => !!p,
      );
      const heading = [
        itemLabelById.get(v.itemId) ?? "Item",
        v.segmentId ? segmentLabelById.get(v.segmentId) : null,
      ]
        .filter(Boolean)
        .join(" — ");
      return {
        heading,
        fields: [
          { label: "État", value: STATE_LABELS[v.state] ?? v.state },
          {
            label: "Sévérité",
            value: v.severity ? (SEVERITY_LABELS[v.severity] ?? v.severity) : "",
          },
          { label: "Localisation", value: v.locationAction ?? "" },
          { label: "Commentaire", value: v.comment ?? "" },
        ],
        photos,
      };
    }),
  );

  const meta: PdfMeta = [
    { label: "Semaine", value: inspection.weekNumber ? String(inspection.weekNumber) : "" },
    { label: "Échéance", value: inspection.dueDate ? inspection.dueDate.slice(0, 10) : "" },
  ];
  if (schema.module === "vertical") {
    meta.push({
      label: "Secteur",
      value:
        inspection.sector === "landside"
          ? "Landside"
          : inspection.sector === "airside"
            ? "Airside"
            : "",
    });
    meta.push({
      label: "Conformité",
      value:
        inspection.acceptance === "conforme"
          ? "Conforme"
          : inspection.acceptance === "non_conforme"
            ? "Non conforme"
            : "",
    });
  }

  exportFichePdf({
    title: schema.name,
    subtitle: `Version ${schema.version}`,
    status: STATUS_LABELS[inspection.status] ?? inspection.status,
    meta,
    constats,
    comment: inspection.headerComment ?? "",
    submittedBy: inspection.submittedBy?.displayName ?? null,
    submittedAt: inspection.submittedAt,
  });
}
