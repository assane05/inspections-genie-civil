/**
 * Utilisateurs — remplace src/lib/user-directory.ts (localStorage) par de
 * vrais appels à l'API backend (voir las-inspections-api/src/routes/users.ts).
 * Réservé à l'admin côté backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Role, SessionUser } from "@/lib/auth-api";

export const userKeys = { all: ["users"] as const };

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => api.get<{ users: SessionUser[] }>("/users"),
    select: (d) => d.users,
  });
}

export type CreateUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  groups: string[];
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<{ user: SessionUser }>("/users", input).then((r) => r.user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export type UpdateUserPatch = Partial<
  Pick<SessionUser, "name" | "username" | "email" | "role" | "groups" | "isActive">
> & { password?: string };

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserPatch }) =>
      api.patch<{ user: SessionUser }>(`/users/${id}`, patch).then((r) => r.user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}
