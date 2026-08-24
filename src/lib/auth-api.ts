export type Role = "admin" | "supervisor";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  groups: string[];
  initials: string;
  isActive: boolean;
};

type BackendRole = "superviseur" | "administrateur" | "approbateur";
type BackendSessionUser = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: BackendRole;
  groupIds: string[];
  groupNames: string[];
  isActive: boolean;
};

function toFrontendRole(role: BackendRole): Role {
  return role === "superviseur" ? "supervisor" : "admin";
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function fromBackendUser(u: BackendSessionUser): SessionUser {
  return {
    id: u.id,
    name: u.displayName,
    username: u.username,
    email: u.email ?? "",
    role: toFrontendRole(u.role),
    groups: u.groupNames,
    initials: initialsFor(u.displayName),
    isActive: u.isActive,
  };
}

export type AuthResult = {
  user: SessionUser;
  expiresIn: number;
};

const API_URL = import.meta.env.VITE_AUTH_API_URL as string | undefined;

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const IDLE_TIMEOUT_SECONDS = 15 * 60;
// export const IDLE_TIMEOUT_SECONDS = 60 * 60; pour 1h

export const SUPERVISOR_GROUPS = [
  "Supervisor 1",
  "Supervisor 2",
  "Supervisor 3",
  "Supervisor 4",
  "Supervisor 5",
];

const DEMO_DIRECTORY: SessionUser[] = [
  {
    id: "u-admin-1",
    name: "Approver 1",
    username: "approver1",
    email: "approver1@las.aero",
    role: "admin",
    groups: [...SUPERVISOR_GROUPS],
    initials: "A1",
    isActive: true,
  },
  ...SUPERVISOR_GROUPS.map((group, i) => ({
    id: `u-supervisor-${i + 1}`,
    name: `Supervisor ${i + 1}`,
    username: `supervisor${i + 1}`,
    email: `supervisor${i + 1}@las.aero`,
    role: "supervisor" as Role,
    groups: [group],
    initials: `S${i + 1}`,
    isActive: true,
  })),
];

export class AuthError extends Error {}

function findDemoUser(identifier: string): SessionUser | undefined {
  const key = identifier.trim().toLowerCase();
  return DEMO_DIRECTORY.find((u) => u.username === key || u.email.toLowerCase() === key);
}

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  if (API_URL) {
    const res = await fetch(`${API_URL.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) throw new AuthError("invalid_credentials");
    const data = (await res.json()) as { user?: BackendSessionUser; expiresIn?: number };
    if (!data.user) throw new AuthError("invalid_response");
    return { user: fromBackendUser(data.user), expiresIn: data.expiresIn ?? SESSION_TTL_SECONDS };
  }

  if (import.meta.env.PROD) {
    throw new AuthError("backend_not_configured");
  }

  // mode demo
  await new Promise((r) => setTimeout(r, 500));
  const user = findDemoUser(identifier);
  if (!user || !user.isActive || password.trim().length < 8) {
    throw new AuthError("invalid_credentials");
  }
  return { user, expiresIn: SESSION_TTL_SECONDS };
}

export async function revokeSession(): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL.replace(/\/$/, "")}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
}

export function homeRouteFor(role: Role): string {
  return role === "supervisor" ? "/supervisor/tasks" : "/dashboard";
}
