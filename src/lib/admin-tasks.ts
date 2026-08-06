import { makeTask, taskRows, isoWeek, type TaskRow } from "./mock-data";

const KEY = "las.admin-created-tasks";

function readAll(): TaskRow[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as TaskRow[];
  } catch {
    return [];
  }
}

function writeAll(tasks: TaskRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(tasks));
}

/** Toutes les tâches (mock de base + créées par l'admin), pour listing/filtres admin. */
export function listAllTasks(): TaskRow[] {
  return [...taskRows, ...readAll()];
}

export type CreateTasksInput = {
  form: string;
  /** Une tâche est créée par combinaison zone × groupe (assignation en lot). */
  zones: string[];
  groups: string[];
  notes: string;
  dueISO: string;
  kind: TaskRow["kind"];
};

/** Assignation individuelle (1 zone × 1 groupe) ou en lot (plusieurs zones et/ou groupes). */
export function createTasks(input: CreateTasksInput): TaskRow[] {
  const created: TaskRow[] = [];
  let seq = 0;
  for (const zone of input.zones) {
    for (const group of input.groups) {
      seq += 1;
      const id = `admin-${Date.now()}-${seq}`;
      created.push(
        makeTask(
          id,
          input.form,
          input.dueISO,
          zone,
          input.notes,
          group,
          "not_submitted",
          input.kind,
        ),
      );
    }
  }
  const all = readAll();
  writeAll([...all, ...created]);
  return created;
}

export function deleteTask(id: string) {
  writeAll(readAll().filter((t) => t.id !== id));
}

// Réexport pour les écrans admin qui veulent afficher/valider la semaine ISO d'une échéance.
export { isoWeek };
