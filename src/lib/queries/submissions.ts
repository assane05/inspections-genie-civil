import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type ApiSubmission = {
  id: string;
  taskId: string;
  kind: "horizontal" | "batiment";
  form: string;
  zone: string;
  notes: string;
  group: string;
  sector: string | null;
  compliance: string | null;
  comment: string;
  defects: unknown[];
  modelVersion: Record<string, number>;
  submittedAt: string;
  submittedBy: { id: string; name: string };
};

export const submissionKeys = {
  all: ["submissions"] as const,
  byTask: (taskId: string) => [...submissionKeys.all, "task", taskId] as const,
};

export function useSubmissionsForTask(taskId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.byTask(taskId ?? ""),
    queryFn: () => api.get<{ submissions: ApiSubmission[] }>(`/submissions?taskId=${taskId}`),
    select: (d) => d.submissions,
    enabled: !!taskId,
  });
}
