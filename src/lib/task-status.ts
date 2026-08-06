/**
 * Statut de soumission d'une tâche (sprint 11) + auteur/horodatage (sprint 12).
 *
 * mock-data.ts est un jeu de données statique : pour que le passage
 * "Not Submitted/En cours → En attente de vérification" reste visible après
 * navigation (sans backend), on stocke un "override" par tâche en localStorage,
 * fusionné avec le statut de base à l'affichage.
 *
 * Limite connue : `submittedAt` est l'horloge du client, pas un horodatage
 * serveur — l'AC demande une "date/heure serveur fiable", qui nécessite un
 * vrai backend pour être garantie. On l'enregistre déjà pour ne rien perdre,
 * à remplacer par la valeur serveur dès que l'API existe.
 */

const KEY = "las.task-status-overrides";

export type TaskStatusOverride = {
  status: "pending" | "verified";
  /** Nom de l'utilisateur connecté au moment de la soumission. */
  submittedBy: string;
  /** Horodatage client (ISO) — voir limite ci-dessus. */
  submittedAt: string;
};

function readAll(): Record<string, TaskStatusOverride> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      TaskStatusOverride
    >;
  } catch {
    return {};
  }
}

function writeAll(overrides: Record<string, TaskStatusOverride>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(overrides));
}

export function getTaskOverride(taskId: string): TaskStatusOverride | null {
  return readAll()[taskId] ?? null;
}

/** Marque une tâche comme soumise (Not Submitted/En cours → En attente de vérification). */
export function submitTask(taskId: string, submittedBy: string): TaskStatusOverride {
  const override: TaskStatusOverride = {
    status: "pending",
    submittedBy,
    submittedAt: new Date().toISOString(),
  };
  const all = readAll();
  all[taskId] = override;
  writeAll(all);
  return override;
}
