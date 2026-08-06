/**
 * Adaptateur d'authentification — À BRANCHER SUR VOTRE BACKEND.
 *
 * Règles de sécurité respectées ici :
 *  - aucun mot de passe ni secret n'est stocké en dur dans le front (AUD-01) ;
 *  - la vérification du mot de passe (hachage bcrypt/argon2) doit être faite
 *    côté serveur ; le front n'envoie que l'identifiant + le mot de passe
 *    via HTTPS et reçoit un profil + une durée de session ;
 *  - l'URL du backend se configure via la variable d'environnement
 *    `VITE_AUTH_API_URL` (ex : https://api.votre-domaine.com).
 */

export type Role = "admin" | "supervisor";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  /** Un utilisateur appartient à un ou plusieurs groupes (Supervisor 1–5). */
  groups: string[];
  initials: string;
};

export type AuthResult = {
  user: SessionUser;
  /** Durée de vie absolue de la session en secondes. */
  expiresIn: number;
};

const API_URL = import.meta.env.VITE_AUTH_API_URL as string | undefined;

/** Session absolue : 8 h. Inactivité : 15 min (voir auth.tsx). */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const IDLE_TIMEOUT_SECONDS = 15 * 60;

/**
 * Annuaire de démonstration : uniquement des profils (rôle + groupes),
 * jamais de mots de passe. Il est ignoré dès que `VITE_AUTH_API_URL` est défini.
 */
/** Groupes de supervision — source unique, réutilisée pour l'assignation de tâches et la gestion des utilisateurs. */
export const SUPERVISOR_GROUPS = [
  "Supervisor 1",
  "Supervisor 2",
  "Supervisor 3",
  "Supervisor 4",
  "Supervisor 5",
];

const demoDirectory: SessionUser[] = [
  {
    id: "u-admin-1",
    name: "Approver 1",
    username: "approver1",
    email: "approver1@las.aero",
    role: "admin",
    groups: [...SUPERVISOR_GROUPS],
    initials: "A1",
  },
  ...SUPERVISOR_GROUPS.map((group, i) => ({
    id: `u-supervisor-${i + 1}`,
    name: `Supervisor ${i + 1}`,
    username: `supervisor${i + 1}`,
    email: `supervisor${i + 1}@las.aero`,
    role: "supervisor" as Role,
    groups: [group],
    initials: `S${i + 1}`,
  })),
];

export class AuthError extends Error {}

function findDemoUser(identifier: string): SessionUser | undefined {
  const key = identifier.trim().toLowerCase();
  return demoDirectory.find((u) => u.username === key || u.email.toLowerCase() === key);
}

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  if (API_URL) {
    const res = await fetch(`${API_URL.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // cookies httpOnly + secure gérés par le backend
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) throw new AuthError("invalid_credentials");
    const data = (await res.json()) as Partial<AuthResult>;
    if (!data.user) throw new AuthError("invalid_response");
    return { user: data.user, expiresIn: data.expiresIn ?? SESSION_TTL_SECONDS };
  }

  // --- Mode démonstration (aucun backend branché) ---
  await new Promise((r) => setTimeout(r, 500));
  const user = findDemoUser(identifier);
  if (!user || password.trim().length < 8) throw new AuthError("invalid_credentials");
  return { user, expiresIn: SESSION_TTL_SECONDS };
}

export async function revokeSession(): Promise<void> {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL.replace(/\/$/, "")}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* déconnexion locale quand même */
  }
}

export function homeRouteFor(role: Role): string {
  return role === "supervisor" ? "/supervisor/tasks" : "/dashboard";
}
