import { type TaskRow } from "@/lib/mock-data";

export type TaskFilters = {
  q: string;
  form: string;
  year: string;
  bimester: string;
  week: string;
  status: string;
  /** Filtre groupe — utilisé côté admin (vue tous groupes) ; "all" partout ailleurs. */
  group: string;
};

export const emptyFilters: TaskFilters = {
  q: "",
  form: "all",
  year: "all",
  bimester: "all",
  week: "all",
  status: "all",
  group: "all",
};

export type DueState = "overdue" | "due_soon" | "ok" | "done";

/** Nombre de jours entre aujourd'hui et l'échéance (négatif = en retard). */
export function daysUntil(iso: string, now = new Date()): number {
  const due = new Date(iso + "T00:00:00").getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / 86_400_000);
}

export function dueState(task: TaskRow, now = new Date()): DueState {
  if (task.status === "verified" || task.status === "pending") return "done";
  const d = daysUntil(task.dueISO, now);
  if (d < 0) return "overdue";
  if (d <= 3) return "due_soon";
  return "ok";
}

/** Progression globale "soumises / total" (sprint 15). Soumise = pending ou verified. */
export function submissionProgress(rows: TaskRow[]): { submitted: number; total: number } {
  const submitted = rows.filter((t) => t.status === "pending" || t.status === "verified").length;
  return { submitted, total: rows.length };
}

/** Progression "X of Y" par formulaire (sprint 13). */
export function progressByForm(
  rows: TaskRow[],
): { form: string; submitted: number; total: number }[] {
  const byForm = new Map<string, { submitted: number; total: number }>();
  for (const t of rows) {
    const entry = byForm.get(t.form) ?? { submitted: 0, total: 0 };
    entry.total += 1;
    if (t.status === "pending" || t.status === "verified") entry.submitted += 1;
    byForm.set(t.form, entry);
  }
  return [...byForm.entries()]
    .map(([form, v]) => ({ form, ...v }))
    .sort((a, b) => a.form.localeCompare(b.form));
}

export function applyFilters(rows: TaskRow[], f: TaskFilters): TaskRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((t) => {
    if (q && !`${t.form} ${t.zone} ${t.notes}`.toLowerCase().includes(q)) return false;
    if (f.form !== "all" && t.form !== f.form) return false;
    if (f.group !== "all" && t.group !== f.group) return false;
    if (f.year !== "all" && String(t.year) !== f.year) return false;
    if (f.bimester !== "all" && String(t.bimester) !== f.bimester) return false;
    if (f.week !== "all" && String(t.week) !== f.week) return false;
    if (f.status !== "all") {
      if (f.status === "overdue") return dueState(t) === "overdue";
      if (t.status !== f.status) return false;
    }
    return true;
  });
}

const CSV_HEADERS = [
  "Formulaire",
  "Date limite",
  "Zone",
  "Notes",
  "Groupe",
  "Annee",
  "Bimestre",
  "Semaine",
  "Etat",
  "Echeance",
];

const statusLabel: Record<TaskRow["status"], string> = {
  not_submitted: "Non soumis",
  in_progress: "En cours",
  pending: "En attente de vérification",
  verified: "Vérifié",
};

const dueLabel: Record<DueState, string> = {
  overdue: "En retard",
  due_soon: "Échéance proche",
  ok: "Dans les délais",
  done: "Terminé",
};

function csvCell(v: string | number) {
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Génère le CSV de la liste **déjà filtrée**. */
export function tasksToCsv(rows: TaskRow[]): string {
  const lines = [CSV_HEADERS.join(";")];
  for (const t of rows) {
    lines.push(
      [
        t.form,
        t.dueISO,
        t.zone,
        t.notes,
        t.group,
        t.year,
        `B${t.bimester}`,
        `S${t.week}`,
        statusLabel[t.status],
        dueLabel[dueState(t)],
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { statusLabel, dueLabel };
