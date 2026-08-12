import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type DictionaryKey = "families" | "fiche-catalog" | "building-categories";

type DictionaryResponse<T> = { key: DictionaryKey; data: T; version: number };

export const dictionaryKeys = {
  all: ["dictionary"] as const,
  detail: (key: DictionaryKey) => [...dictionaryKeys.all, key] as const,
};

export function useDictionary<T>(key: DictionaryKey) {
  return useQuery({
    queryKey: dictionaryKeys.detail(key),
    queryFn: () => api.get<DictionaryResponse<T>>(`/dictionary/${key}`),
  });
}

export function useSaveDictionary<T>(key: DictionaryKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => api.put<DictionaryResponse<T>>(`/dictionary/${key}`, { data }),
    onSuccess: (res) => queryClient.setQueryData(dictionaryKeys.detail(key), res),
  });
}

export function useResetDictionary<T>(key: DictionaryKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DictionaryResponse<T>>(`/dictionary/${key}/reset`),
    onSuccess: (res) => queryClient.setQueryData(dictionaryKeys.detail(key), res),
  });
}
