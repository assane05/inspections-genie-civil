import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

type Dict = Record<string, { fr: string; en: string }>;

const dict: Dict = {
  "app.name": { fr: "LAS Inspections", en: "LAS Inspections" },
  "app.tagline": { fr: "Infrastructures Horizontales", en: "Horizontal Infrastructures" },
  "nav.dashboard": { fr: "Tableau de bord", en: "Dashboard" },
  "nav.forms": { fr: "Formulaires", en: "Forms" },
  "nav.available_forms": { fr: "Formulaires disponibles", en: "Available forms" },
  "nav.submissions": { fr: "Soumissions", en: "Submissions" },
  "nav.tasks": { fr: "Tâches", en: "Tasks" },
  "nav.new_task": { fr: "Créer une tâche", en: "New task" },
  "nav.planning": { fr: "Planning", en: "Planning" },
  "nav.evaluation": { fr: "Formulaire d'évaluation", en: "Evaluation form" },
  "nav.gallery": { fr: "Galerie photos", en: "Photo gallery" },
  "nav.analytics": { fr: "Analytique / Archives", en: "Analytics / Archives" },
  "nav.inspections": { fr: "Inspections", en: "Inspections" },
  "nav.settings": { fr: "Paramètres", en: "Settings" },
  "nav.models": { fr: "Modèles de formulaires", en: "Form templates" },
  "nav.users": { fr: "Utilisateurs & groupes", en: "Users & groups" },
  "topbar.search": { fr: "Rechercher un formulaire, une tâche…", en: "Search forms, tasks…" },
  "topbar.profile": { fr: "Mon profil", en: "My profile" },
  "topbar.settings": { fr: "Paramètres", en: "Settings" },
  "topbar.logout": { fr: "Se déconnecter", en: "Sign out" },
  "topbar.language": { fr: "Langue", en: "Language" },
  "kpi.total_forms": { fr: "Total des formulaires", en: "Total forms" },
  "kpi.verified": { fr: "Formulaires vérifiés", en: "Verified forms" },
  "kpi.total_tasks": { fr: "Total des tâches", en: "Total tasks" },
  "kpi.submitted_tasks": { fr: "Tâches soumises", en: "Submitted tasks" },
  "chart.assignments": { fr: "Distribution des assignations", en: "Assignments distribution" },
  "chart.trend": { fr: "Tendance sur 8 semaines", en: "8-week trend" },
  "chart.by_group": { fr: "Par groupe d'inspection", en: "By inspection group" },
  "table.recent": { fr: "Activité récente", en: "Recent activity" },
  "table.form": { fr: "Formulaire", en: "Form" },
  "table.last_submission": { fr: "Dernière soumission", en: "Last submission" },
  "table.week": { fr: "Semaine", en: "Week" },
  "table.verified_on": { fr: "Vérifié le", en: "Verified on" },
  "table.assignments": { fr: "Assignations", en: "Assignments" },
  "table.status": { fr: "État", en: "Status" },
  "table.approver": { fr: "Approbateur", en: "Approver" },
  "table.actions": { fr: "Actions", en: "Actions" },
  "table.due": { fr: "Date limite", en: "Due date" },
  "table.notes": { fr: "Notes", en: "Notes" },
  "table.group": { fr: "Groupe", en: "Group" },
  "status.verified": { fr: "Vérifié", en: "Verified" },
  "status.pending": { fr: "En attente de vérification", en: "Awaiting verification" },
  "status.not_submitted": { fr: "Non soumis", en: "Not submitted" },
  "status.in_progress": { fr: "En cours", en: "In progress" },
  "action.review": { fr: "Relire", en: "Review" },
  "action.edit": { fr: "Modifier", en: "Edit" },
  "action.start": { fr: "Démarrer", en: "Start" },
  "action.delete": { fr: "Supprimer", en: "Delete" },
  "action.filter": { fr: "Filtrer", en: "Filter" },
  "action.export_charts": { fr: "Télécharger graphes", en: "Export charts" },
  "action.export_pdf": { fr: "Télécharger PDFs filtrés", en: "Export filtered PDFs" },
  "action.new_task": { fr: "Nouvelle tâche", en: "New task" },
  "filters.title": { fr: "Filtres", en: "Filters" },
  "filters.year": { fr: "Année", en: "Year" },
  "filters.period": { fr: "Période", en: "Period" },
  "filters.group": { fr: "Groupe", en: "Group" },
  "filters.form": { fr: "Nom du formulaire", en: "Form name" },
  "filters.bimester": { fr: "Bimestre", en: "Bimester" },
  "filters.week": { fr: "Semaine", en: "Week" },
  "dashboard.title": { fr: "Analytique", en: "Analytics" },
  "dashboard.subtitle": {
    fr: "Vue d'ensemble des inspections d'infrastructures horizontales",
    en: "Overview of horizontal infrastructure inspections",
  },
  "forms.title": { fr: "Formulaires", en: "Forms" },
  "forms.available": { fr: "Formulaires disponibles", en: "Available forms" },
  "forms.code": { fr: "Code", en: "Code" },
  "tasks.title": { fr: "Tâches", en: "Tasks" },
  "tasks.new.title": { fr: "Création de tâche", en: "Create task" },
  "planning.title": { fr: "Planning", en: "Planning" },
  "planning.upload": { fr: "Importer le fichier CSV du planning", en: "Upload planning CSV file" },
  "planning.complete": { fr: "Compléter le planning", en: "Complete planning" },
  "evaluation.title": { fr: "Formulaire d'évaluation", en: "Evaluation form" },
  "evaluation.period_start": { fr: "Début de période", en: "Period start" },
  "evaluation.period_end": { fr: "Fin de période", en: "Period end" },
  "evaluation.add_row": { fr: "Ajouter une ligne", en: "Add row" },
  "evaluation.submit": { fr: "Soumettre", en: "Submit" },
  "gallery.title": { fr: "Galerie photos", en: "Photo gallery" },
  "gallery.subtitle": {
    fr: "Preuves visuelles associées aux inspections",
    en: "Visual evidence attached to inspections",
  },
  "common.apply": { fr: "Appliquer", en: "Apply" },
  "common.reset": { fr: "Réinitialiser", en: "Reset" },
  "common.view_all": { fr: "Voir tout", en: "View all" },
  "common.this_month": { fr: "Ce mois-ci", en: "This month" },
  "common.vs_last": { fr: "vs mois précédent", en: "vs last month" },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "fr";
    return (localStorage.getItem("lang") as Lang) || "fr";
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  const t = (key: keyof typeof dict) => dict[key]?.[lang] ?? String(key);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
