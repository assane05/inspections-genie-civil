/**
 * Dictionnaire versionné (familles, catalogue de fiches, checklist bâtiment) —
 * remplace src/lib/dictionary-store.ts (localStorage) par de vrais appels à
 * l'API backend (voir las-inspections-api/src/routes/dictionary.ts).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type DictionaryKey = "families" | "fiche-catalog" | "building-categories";

type DictionaryResponse<T> = { key: DictionaryKey; data: T; version: number };

export const dictionaryKeys = {
  all: ["dictionary"] as const,
  detail: (key: DictionaryKey) => [...dictionaryKeys.all, key] as const,
};

/** Lecture — accessible à tout utilisateur connecté (un superviseur en a besoin pour remplir une fiche). */
export function useDictionary<T>(key: DictionaryKey) {
  return useQuery({
    queryKey: dictionaryKeys.detail(key),
    queryFn: () => api.get<DictionaryResponse<T>>(`/dictionary/${key}`),
  });
}

/** Écriture — réservée à l'admin (appliqué aussi côté serveur). */
export function useSaveDictionary<T>(key: DictionaryKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: T) => api.put<DictionaryResponse<T>>(`/dictionary/${key}`, { data }),
    onSuccess: (res) => queryClient.setQueryData(dictionaryKeys.detail(key), res),
  });
}

/** Réinitialisation aux valeurs par défaut — réservée à l'admin. */
export function useResetDictionary<T>(key: DictionaryKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DictionaryResponse<T>>(`/dictionary/${key}/reset`),
    onSuccess: (res) => queryClient.setQueryData(dictionaryKeys.detail(key), res),
  });
}
