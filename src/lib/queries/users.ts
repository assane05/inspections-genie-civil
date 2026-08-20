import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type AdminRole = "superviseur" | "administrateur" | "approbateur";

export type AdminGroup = { id: string; name: string };

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  groups: AdminGroup[];
};

export const userAdminKeys = {
  users: ["admin", "users"] as const,
  groups: ["admin", "groups"] as const,
};

export function useAdminUsers() {
  return useQuery({
    queryKey: userAdminKeys.users,
    queryFn: () => api.get<{ users: AdminUser[] }>("/api/users"),
    select: (d) => d.users,
  });
}

export function useAdminGroups() {
  return useQuery({
    queryKey: userAdminKeys.groups,
    queryFn: () => api.get<{ groups: AdminGroup[] }>("/api/users/groups"),
    select: (d) => d.groups,
  });
}

export type CreateUserInput = {
  username: string;
  displayName: string;
  email?: string | null;
  role: AdminRole;
  password: string;
  groupIds: string[];
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<AdminUser>("/api/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userAdminKeys.users }),
  });
}

export type UpdateUserInput = {
  id: string;
  displayName?: string;
  username?: string;
  email?: string | null;
  role?: AdminRole;
  isActive?: boolean;
  password?: string;
  groupIds?: string[];
};

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateUserInput) =>
      api.patch<AdminUser>(`/api/users/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userAdminKeys.users }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userAdminKeys.users }),
  });
}
