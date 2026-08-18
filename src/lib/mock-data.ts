export const currentUser = {
  name: "Approver 1",
  username: "approver1",
  email: "approver1@las.aero",
  role: "Approver",
  initials: "A1",
  avatar: null,
};

export const supervisorUser = {
  name: "Supervisor 1",
  username: "supervisor1",
  email: "supervisor1@las.aero",
  role: "Supervisor",
  initials: "S1",
  avatar: null,
};

export const kpis = {
  totalForms: 248,
  verifiedForms: 187,
  verifiedPct: 75,
  totalTasks: 96,
  submittedTasks: 62,
  submittedPct: 65,
  deltaForms: 12,
  deltaTasks: -4,
};

export const assignmentsDist = [
  { name: "Soumis", value: 62, color: "var(--color-chart-1)" },
  { name: "Non soumis", value: 34, color: "var(--color-chart-4)" },
];

export const trend = [
  { week: "S27", submitted: 22, verified: 14 },
  { week: "S28", submitted: 28, verified: 20 },
  { week: "S29", submitted: 34, verified: 26 },
  { week: "S30", submitted: 30, verified: 24 },
  { week: "S31", submitted: 38, verified: 31 },
  { week: "S32", submitted: 42, verified: 33 },
  { week: "S33", submitted: 45, verified: 39 },
  { week: "S34", submitted: 52, verified: 44 },
];

export const byGroup = [
  { group: "Runway", count: 42 },
  { group: "Taxiway", count: 38 },
  { group: "Apron / GSE", count: 29 },
  { group: "Service Road", count: 21 },
  { group: "Access Road", count: 18 },
  { group: "Fence / CR Int", count: 15 },
  { group: "Drainage", count: 12 },
];

export const availableForms = [
  {
    group: "Runway",
    items: [
      { name: "Fiche d'inspection Runway", code: "MAINT/EN/73/00" },
      { name: "Fiche inspection bande de pistes-RESA", code: "TEMP-1" },
      { name: "Fiche d'inspection balisage diurne Runway", code: "MAINT/EN/110/00" },
    ],
  },
  {
    group: "Taxiway",
    items: [
      { name: "Fiche d'inspection Taxiway", code: "MAINT/EN/74/00" },
      { name: "Fiche inspection bande de piste-TWY", code: "TEMP-2" },
      { name: "Fiche d'inspection balisage diurne Taxiway", code: "MAINT/EN/111/00" },
    ],
  },
  {
    group: "Apron et GSE Road",
    items: [
      { name: "Fiche d'inspection Apron", code: "MAINT/EN/75/00" },
      { name: "Fiche d'inspection GSE Road", code: "MAINT/EN/76/00" },
      { name: "Fiche d'inspection balisage diurne Apron", code: "MAINT/EN/112/00" },
    ],
  },
  {
    group: "Service Road",
    items: [{ name: "Fiche d'inspection Service Road", code: "MAINT/EN/77/00" }],
  },
  {
    group: "Acces Road - Chemin de Ronde Ext - Parking Auto",
    items: [
      { name: "Fiche d'inspection Access Road", code: "MAINT/EN/78/00" },
      { name: "Fiche d'inspection Parking", code: "MAINT/EN/79/00" },
    ],
  },
  {
    group: "Fence et Chemin de Ronde Int",
    items: [{ name: "Fiche d'inspection Fence", code: "MAINT/EN/80/00" }],
  },
  {
    group: "Ouvrage de Drainage",
    items: [{ name: "Fiche d'inspection Drainage", code: "MAINT/EN/81/00" }],
  },
];

export type FormRow = {
  id: string;
  name: string;
  lastSubmission: string;
  week: number;
  verifiedOn: string | null;
  assignments: string;
  status: "verified" | "pending" | "not_submitted";
  approver: string | null;
};

export const formRows: FormRow[] = [
  {
    id: "1",
    name: "Fiche d'inspection balisage diurne Taxiway",
    lastSubmission: "25 août 2025 14:49",
    week: 29,
    verifiedOn: "23 juil. 2025 09:07",
    assignments: "3 of 4",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "2",
    name: "Fiche d'inspection Taxiway",
    lastSubmission: "25 août 2025 12:42",
    week: 29,
    verifiedOn: "23 juil. 2025 09:06",
    assignments: "3 of 4",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "3",
    name: "Fiche inspection bande de piste-TWY",
    lastSubmission: "21 juil. 2025 11:16",
    week: 30,
    verifiedOn: "23 juil. 2025 09:07",
    assignments: "1 of 1",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "4",
    name: "Fiche d'inspection balisage GSE Road",
    lastSubmission: "3 déc. 2024 13:06",
    week: 46,
    verifiedOn: "23 juil. 2025 09:04",
    assignments: "2 of 2",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "5",
    name: "Fiche d'inspection GSE road",
    lastSubmission: "4 juin 2025 12:23",
    week: 23,
    verifiedOn: "17 juin 2025 11:30",
    assignments: "1 of 1",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "6",
    name: "Fiche d'inspection Apron",
    lastSubmission: "11 juin 2025 13:16",
    week: 14,
    verifiedOn: "17 juin 2025 11:29",
    assignments: "6 of 6",
    status: "verified",
    approver: "form_approver",
  },
  {
    id: "7",
    name: "Fiche d'inspection Runway",
    lastSubmission: "5 mai 2025 11:33",
    week: 19,
    verifiedOn: null,
    assignments: "1 of 3",
    status: "pending",
    approver: null,
  },
  {
    id: "8",
    name: "Fiche d'inspection balisage diurne parking",
    lastSubmission: "20 jan. 2025 15:11",
    week: 7,
    verifiedOn: null,
    assignments: "5 of 6",
    status: "pending",
    approver: null,
  },
];

export type TaskRow = {
  id: string;
  form: string;
  dueISO: string;
  dueDate: string;
  zone: string;
  notes: string;
  group: string;
  year: number;
  bimester: number;
  week: number;
  status: "not_submitted" | "in_progress" | "pending" | "verified";
  kind: "horizontal" | "batiment";
};

function frDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isoWeek(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

export function makeTask(
  id: string,
  form: string,
  iso: string,
  zone: string,
  notes: string,
  group: string,
  status: TaskRow["status"],
  kind: TaskRow["kind"] = "horizontal",
): TaskRow {
  const date = new Date(iso + "T00:00:00");
  return {
    id,
    form,
    dueISO: iso,
    dueDate: frDate(iso),
    zone,
    notes,
    group,
    year: date.getFullYear(),
    bimester: Math.floor(date.getMonth() / 2) + 1,
    week: isoWeek(iso),
    status,
    kind,
  };
}
