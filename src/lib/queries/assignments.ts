import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * Traduit le statut d'inspection (schéma v1.1) vers le vocabulaire d'écran
 * existant (TaskRow.status). "rejete" n'a pas d'équivalent direct — traité
 * comme "non_submitted" (à refaire) en attendant un statut dédié côté UI.
 */
function toTaskStatus(inspection: ApiInspectionSummary | null): TaskRow["status"] {
  if (!inspection) return "not_submitted";
  if (inspection.status === "verifie") return "verified";
  if (inspection.status === "soumis") return "pending";
  if (inspection.status === "rejete") return "not_submitted";
  return inspection.hasValues ? "in_progress" : "not_submitted";
}

/** L'écran de fiche résout désormais l'inspection depuis l'assignmentId (création idempotente) — id = assignment.id. */
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

/** Le filtrage par groupe est appliqué côté serveur (superviseur = ses groupes, admin/approbateur = tout). */
export function useAssignments() {
  return useQuery({
    queryKey: assignmentKeys.list(),
    queryFn: () => api.get<{ assignments: ApiAssignment[] }>("/api/assignments"),
    select: (data) => data.assignments.map(toTaskRow),
  });
}

// ========= GET /api/form-types (liste, pour le sélecteur de création) =========

export type FormTypeSummary = {
  id: string;
  code: string;
  name: string;
  module: "horizontal" | "vertical";
  version: number;
};

export function useFormTypesList() {
  return useQuery({
    queryKey: ["form-types", "list"] as const,
    queryFn: () => api.get<{ formTypes: FormTypeSummary[] }>("/api/form-types"),
    select: (d) => d.formTypes,
  });
}

// ========= POST /api/assignments (création en lot zones × groupes) =========

export type CreateAssignmentsInput = {
  formTypeId: string;
  zones: string[];
  groupIds: string[];
  dueISO: string;
  notes?: string;
};

export function useCreateAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentsInput) =>
      api
        .post<{ assignments: ApiAssignment[] }>("/api/assignments", {
          formTypeId: input.formTypeId,
          zones: input.zones,
          groupIds: input.groupIds,
          dueDate: input.dueISO,
          notes: input.notes,
        })
        .then((r) => r.assignments.map(toTaskRow)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

// ========= DELETE /api/assignments/:id =========

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/assignments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}
