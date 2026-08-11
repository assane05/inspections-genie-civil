/**
 * Tâches — remplace src/lib/admin-tasks.ts (localStorage) par de vrais appels
 * à l'API backend (voir las-inspections-api/src/routes/tasks.ts).
 *
 * Le scoping par groupe pour un superviseur est fait côté serveur (session
 * authentifiée) — pas besoin de le refaire ici.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TaskRow } from "@/lib/mock-data";

/** Forme brute renvoyée par l'API (dueDate en ISO datetime, pas de libellé FR). */
type ApiTask = Omit<TaskRow, "dueISO" | "dueDate"> & { dueDate: string };

function frLabel(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toTaskRow(t: ApiTask): TaskRow {
  const dueISO = t.dueDate.slice(0, 10);
  return { ...t, dueISO, dueDate: frLabel(dueISO) };
}

export const taskKeys = {
  all: ["tasks"] as const,
  list: (filters: Record<string, string | string[] | undefined> = {}) =>
    [...taskKeys.all, "list", filters] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
};

export type TaskQueryFilters = {
  form?: string;
  status?: string;
  group?: string | string[];
  year?: string;
  bimester?: string;
  week?: string;
  q?: string;
};

function toQueryString(filters: TaskQueryFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "all" || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Liste des tâches. Sans filtre, un superviseur reçoit automatiquement ses
 * propres tâches (scoping serveur) ; l'admin reçoit tout.
 */
export function useTasks(filters: TaskQueryFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.get<{ tasks: ApiTask[] }>(`/tasks${toQueryString(filters)}`),
    select: (data) => data.tasks.map(toTaskRow),
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: () => api.get<{ task: ApiTask }>(`/tasks/${id}`),
    select: (data) => toTaskRow(data.task),
    enabled: !!id,
  });
}

export type CreateTasksInput = {
  form: string;
  zones: string[];
  groups: string[];
  notes: string;
  dueISO: string;
  kind: TaskRow["kind"];
};

/** Création en lot (une tâche par combinaison zone × groupe) — assignation individuelle ou en lot. */
export function useCreateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTasksInput) =>
      api
        .post<{ tasks: ApiTask[] }>("/tasks", { ...input, dueISO: input.dueISO })
        .then((r) => r.tasks.map(toTaskRow)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
