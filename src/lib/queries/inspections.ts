import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiUrl, ApiError } from "@/lib/api-client";
import { enqueueSubmission } from "@/lib/offline-queue";

export type FindingState = "non_inspecte" | "ras" | "minor" | "major" | "yes" | "na";
export type SeverityLevel = "leger" | "moyen" | "eleve";

export type FormSchemaItem = { id: string; label: string; sortOrder: number };
export type FormSchemaSection = {
  id: string;
  code: string | null;
  label: string;
  sortOrder: number;
  items: FormSchemaItem[];
};
export type FormSchemaSegment = { id: string; label: string; sortOrder: number };

export type FormTypeSchema = {
  id: string;
  code: string;
  name: string;
  module: "horizontal" | "vertical";
  version: number;
  sections: FormSchemaSection[];
  segments: FormSchemaSegment[];
};

export type InspectionPhoto = {
  id: string;
  inspectionValueId: string;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
};

export type CorrectiveAction = {
  id: string;
  inspectionValueId: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
};

export type InspectionValue = {
  id: string;
  inspectionId: string;
  itemId: string;
  segmentId: string | null;
  state: FindingState;
  severity: SeverityLevel | null;
  revealQualitative: string | null;
  locationAction: string | null;
  comment: string | null;
  photos: InspectionPhoto[];
  correctiveActions: CorrectiveAction[];
};

export type Inspection = {
  id: string;
  assignmentId: string | null;
  formTypeId: string;
  groupId: string;
  ouvrage: string | null;
  sector: "landside" | "airside" | null;
  acceptance: "conforme" | "non_conforme" | null;
  headerComment: string | null;
  status: "non_soumis" | "soumis" | "verifie" | "rejete";
  submittedById: string | null;
  submittedAt: string | null;
  weekNumber: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InspectionWithValues = Inspection & {
  values: InspectionValue[];
  submittedBy: { displayName: string } | null;
};

export const inspectionKeys = {
  formTypeSchema: (formTypeId: string) => ["form-types", formTypeId, "schema"] as const,
  detail: (id: string) => ["inspections", id] as const,
};

// ========= GET /api/form-types/:id/schema =========

export function useFormTypeSchema(formTypeId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.formTypeSchema(formTypeId ?? ""),
    queryFn: () => api.get<FormTypeSchema>(`/api/form-types/${formTypeId}/schema`),
    enabled: !!formTypeId,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// GET /api/inspections/:id
export function useInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(inspectionId ?? ""),
    queryFn: () => api.get<InspectionWithValues>(`/api/inspections/${inspectionId}`),
    enabled: !!inspectionId,
  });
}

//  POST /api/assignments/:assignmentId/inspection =========

export function useResumeInspection() {
  return useMutation({
    mutationFn: (assignmentId: string) =>
      api.post<Inspection>(`/api/assignments/${assignmentId}/inspection`),
  });
}

// ========= PATCH /api/inspections/:id/values =========

export type ValueUpsertInput = {
  itemId: string;
  segmentId?: string | null;
  state: FindingState;
  severity?: SeverityLevel | null;
  revealQualitative?: string | null;
  locationAction?: string | null;
  comment?: string | null;
};

export function usePatchInspectionValues(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: ValueUpsertInput[]) => {
      try {
        return await api.patch<{ values: InspectionValue[] }>(
          `/api/inspections/${inspectionId}/values`,
          { values },
        );
      } catch (err) {
        if (err instanceof ApiError) throw err;
        enqueueSubmission(apiUrl(`/api/inspections/${inspectionId}/values`), { values }, "PATCH");
        return { values: [] as InspectionValue[] };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

// ========= POST /api/inspections/:id/sections/:sectionId/mark-all-ras =========

export function useMarkAllRas(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) =>
      api.post<{ sectionId: string; itemsProcessed: number; valuesTouched: number }>(
        `/api/inspections/${inspectionId}/sections/${sectionId}/mark-all-ras`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

// ========= POST /api/inspections/:id/submit =========

export function useSubmitInspection(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Inspection>(`/api/inspections/${inspectionId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

// ========= PATCH /api/inspections/:id (en-tête bâtiment : secteur, conformité, commentaire) =========

export type InspectionHeaderPatch = {
  sector?: "landside" | "airside" | null;
  acceptance?: "conforme" | "non_conforme" | null;
  headerComment?: string | null;
};

export function usePatchInspectionHeader(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: InspectionHeaderPatch) =>
      api.patch<Inspection>(`/api/inspections/${inspectionId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

// ========= POST /api/inspections/:id/values/:valueId/photos =========
// ========= DELETE /api/inspections/:id/values/:valueId/photos/:photoId =========

export function useAddValuePhoto(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valueId, dataUrl }: { valueId: string; dataUrl: string }) =>
      api.post<InspectionPhoto>(`/api/inspections/${inspectionId}/values/${valueId}/photos`, {
        dataUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

export function useDeleteValuePhoto(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valueId, photoId }: { valueId: string; photoId: string }) =>
      api.delete(`/api/inspections/${inspectionId}/values/${valueId}/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

// ========= PUT/DELETE /api/inspections/:id/values/:valueId/corrective-action =========

export function useSaveCorrectiveAction(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      valueId,
      reference,
      description,
    }: {
      valueId: string;
      reference?: string | null;
      description?: string | null;
    }) =>
      api.put<CorrectiveAction>(
        `/api/inspections/${inspectionId}/values/${valueId}/corrective-action`,
        { reference, description },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}

export function useDeleteCorrectiveAction(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valueId }: { valueId: string }) =>
      api.delete(`/api/inspections/${inspectionId}/values/${valueId}/corrective-action`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
    },
  });
}
