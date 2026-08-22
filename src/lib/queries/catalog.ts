import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  FormSchemaSection,
  FormSchemaSegment,
  FormTypeSchema,
} from "@/lib/queries/inspections";

export type CatalogFormType = {
  id: string;
  code: string;
  name: string;
  module: "horizontal" | "vertical";
  version: number;
  isActive: boolean;
};

export const catalogKeys = {
  formTypes: ["catalog", "form-types"] as const,
  schema: (id: string) => ["form-types", id, "schema"] as const,
};

// ========= Liste (admin — actives + inactives) =========

export function useCatalogFormTypes() {
  return useQuery({
    queryKey: catalogKeys.formTypes,
    queryFn: () => api.get<{ formTypes: CatalogFormType[] }>("/api/catalog/form-types"),
    select: (d) => d.formTypes,
  });
}

// ========= Détail d'une fiche (sections/items/segments) — réutilise l'endpoint existant =========

export function useCatalogFormTypeSchema(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.schema(id ?? ""),
    queryFn: () => api.get<FormTypeSchema>(`/api/form-types/${id}/schema`),
    enabled: !!id,
  });
}

function invalidateSchema(queryClient: ReturnType<typeof useQueryClient>, formTypeId: string) {
  queryClient.invalidateQueries({ queryKey: catalogKeys.schema(formTypeId) });
  queryClient.invalidateQueries({ queryKey: catalogKeys.formTypes });
}

// ========= Form types =========

export function useCreateFormType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { code: string; name: string; module: "horizontal" | "vertical" }) =>
      api.post<CatalogFormType>("/api/catalog/form-types", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.formTypes }),
  });
}

export function usePatchFormType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; isActive?: boolean }) =>
      api.patch<CatalogFormType>(`/api/catalog/form-types/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.formTypes }),
  });
}

export function useDeleteFormType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/form-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.formTypes }),
  });
}

// ========= Sections =========

export function useCreateSection(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; code?: string | null }) =>
      api.post<FormSchemaSection>(`/api/catalog/form-types/${formTypeId}/sections`, input),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function usePatchSection(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; label?: string; code?: string | null }) =>
      api.patch<FormSchemaSection>(`/api/catalog/sections/${id}`, patch),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function useDeleteSection(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/sections/${id}`),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

// ========= Items =========

export function useCreateItem(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, label }: { sectionId: string; label: string }) =>
      api.post(`/api/catalog/sections/${sectionId}/items`, { label }),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function usePatchItem(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      api.patch(`/api/catalog/items/${id}`, { label }),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function useDeleteItem(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/items/${id}`),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

// ========= Segments =========

export function useCreateSegment(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      api.post<FormSchemaSegment>(`/api/catalog/form-types/${formTypeId}/segments`, { label }),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function usePatchSegment(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      api.patch(`/api/catalog/segments/${id}`, { label }),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}

export function useDeleteSegment(formTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/catalog/segments/${id}`),
    onSuccess: () => invalidateSchema(queryClient, formTypeId),
  });
}
