import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type TaskRow, isoWeek } from "@/lib/mock-data";

type ApiFormType = { id: string; code: string; name: string; module: "horizontal" | "vertical" };
type ApiGroup = { id: string; name: string };
type ApiInspectionSummary = {
  id: string;
  status: "non_soumis" | "soumis" | "verifie" | "rejete";
  hasValues: boolean;
};
type ApiAssignment = {
  id: string;
  formType: ApiFormType;
  group: ApiGroup;
  zoneNotes: string | null;
  year: number;
  bimonthlyPeriod: number;
  weekNumber: number | null;
  dueDate: string | null;
  inspection: ApiInspectionSummary | null;
};

function frLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toTaskStatus(inspection: ApiInspectionSummary | null): TaskRow["status"] {
  if (!inspection) return "not_submitted";
  if (inspection.status === "verifie") return "verified";
  if (inspection.status === "soumis") return "pending";
  if (inspection.status === "rejete") return "not_submitted";
  return inspection.hasValues ? "in_progress" : "not_submitted";
}

function toTaskRow(a: ApiAssignment): TaskRow {
  const dueISO = a.dueDate ? a.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return {
    id: a.id,
    form: a.formType.name,
    dueISO,
    dueDate: frLabel(dueISO),
    zone: a.zoneNotes ?? "",
    notes: "",
    group: a.group.name,
    year: a.year,
    bimester: a.bimonthlyPeriod,
    week: a.weekNumber ?? isoWeek(dueISO),
    status: toTaskStatus(a.inspection),
    kind: a.formType.module === "vertical" ? "batiment" : "horizontal",
  };
}

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: () => [...assignmentKeys.all, "list"] as const,
};

export function useAssignments() {
  return useQuery({
    queryKey: assignmentKeys.list(),
    queryFn: () => api.get<{ assignments: ApiAssignment[] }>("/api/assignments"),
    select: (data) => data.assignments.map(toTaskRow),
  });
}
