/**
 * Annuaire des utilisateurs (sprint "Gestion des utilisateurs & groupes").
 *
 * Réutilise le même store versionné que les dictionnaires de fiches
 * (dictionary-store.ts) : les valeurs par défaut (l'annuaire de démonstration)
 * restent la référence tant qu'aucune modification n'a été enregistrée, toute
 * modification prend effet immédiatement (sans redéploiement), et persiste en
 * localStorage.
 *
 * Ce fichier n'importe que des TYPES depuis auth-api.ts (SessionUser, Role) —
 * jamais de valeurs à l'exécution — pour éviter toute dépendance circulaire :
 * auth-api.ts importe des fonctions de CE fichier (listUsers) pour
 * authentifier, donc la dépendance ne doit circuler que dans un seul sens.
 */

import { createVersionedDictionary } from "./dictionary-store";
import type { SessionUser, Role } from "./auth-api";

/** Groupes de supervision — source unique (assignation de tâches + gestion des utilisateurs). */
export const SUPERVISOR_GROUPS = [
  "Supervisor 1",
  "Supervisor 2",
  "Supervisor 3",
  "Supervisor 4",
  "Supervisor 5",
];

/** Annuaire de démonstration : uniquement des profils (rôle + groupes), jamais de mots de passe. */
const DEFAULT_USERS: SessionUser[] = [
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

const store = createVersionedDictionary<SessionUser[]>("users", DEFAULT_USERS);

export function listUsers(): SessionUser[] {
  return store.current();
}
export const getUsersVersion = store.version;
export const usersCustomized = store.isCustomized;

export function saveUsers(next: SessionUser[]): number {
  return store.save(next);
}

export function resetUsers(): number {
  return store.resetToDefaults();
}

export function createUser(input: Omit<SessionUser, "id" | "initials">): SessionUser {
  const initials = input.name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const user: SessionUser = { ...input, id: `u-${Date.now()}`, initials: initials || "??" };
  saveUsers([...listUsers(), user]);
  return user;
}

export function updateUser(id: string, patch: Partial<SessionUser>): void {
  saveUsers(listUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

/** Désactive/réactive un utilisateur — un compte désactivé ne peut plus se connecter. */
export function setUserActive(id: string, isActive: boolean): void {
  updateUser(id, { isActive });
}

export function deleteUser(id: string): void {
  saveUsers(listUsers().filter((u) => u.id !== id));
}
