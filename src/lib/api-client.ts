const API_URL = import.meta.env.VITE_AUTH_API_URL as string | undefined;

export function hasApiBackend(): boolean {
  return !!API_URL;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

export interface DashboardFilters {
  year?: string;
  bimester?: string;
  group?: string;
  formTypeId?: string;
}

export interface DashboardStats {
  kpis: {
    totalForms: number;
    submittedForms: number;
    verifiedForms: number;
    rejectedForms: number;
    verifiedPct: number;
    totalTasks: number;
    submittedTasks: number;
    overdueTasks: number;
    submittedPct: number;
  };

  byStatus: {
    status: string;
    name: string;
    count: number;
  }[];

  assignmentsDist: {
    name: string;
    value: number;
  }[];

  trend: {
    week: string;
    submitted: number;
    verified: number;
    rejected?: number;
  }[];

  byGroup: {
    group: string;
    count: number;
  }[];

  recent: {
    id: string;
    name: string;
    formType: string;
    formTypeId: string;
    group: string;
    groupId: string;
    lastSubmission: string | null;
    week: number | null;
    status: "non_soumis" | "soumis" | "verifie" | "rejete";
  }[];

  filterOptions: {
    years: number[];

    bimesters: number[];

    groups: {
      id: string;
      name: string;
    }[];

    formTypes: {
      id: string;
      code: string;
      name: string;
    }[];
  };
}

/* =========================================================
   EVALUATIONS
========================================================= */

export interface EvaluationSupervisorGroup {
  id: string;
  name: string;
}

export interface EvaluationSupervisor {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  groups: EvaluationSupervisorGroup[];
}

export interface EvaluationPerformance {
  assigned: number;
  completed: number;
  totalInspections: number;
  submitted: number;
  verified: number;
  rejected: number;
  overdue: number;

  completionRate: number;
  verificationRate: number;
  complianceRate: number;
}

export interface EvaluationFindings {
  ras: number;
  yes: number;
  na: number;
  minor: number;
  major: number;
  nonInspected: number;
  evaluable: number;
  compliant: number;
}

export interface EvaluationSummary {
  supervisor: EvaluationSupervisor;
  period: {
    year: number;
    bimester: number;
  };
  performance: EvaluationPerformance;
  findings: EvaluationFindings;
}

export interface Evaluation {
  id: string;
  supervisorId: string;
  createdById: string;
  year: number;
  bimonthlyPeriod: number;
  groupId: string | null;
  respectDelais: number | null;
  qualiteInspections: number | null;
  qualiteObservations: number | null;
  suiviAnomalies: number | null;
  respectProcedures: number | null;
  reactivite: number | null;
  autonomie: number | null;

  strengths: string | null;
  weaknesses: string | null;
  recommendations: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;

  supervisor?: {
    id: string;
    username?: string;
    displayName: string;
  };

  createdBy?: {
    id: string;
    displayName: string;
  };

  group?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateEvaluationPayload {
  supervisorId: string;

  year: number;
  bimonthlyPeriod: number;

  groupId?: string | null;

  respectDelais?: number | null;
  qualiteInspections?: number | null;
  qualiteObservations?: number | null;
  suiviAnomalies?: number | null;
  respectProcedures?: number | null;
  reactivite?: number | null;
  autonomie?: number | null;

  strengths?: string | null;
  weaknesses?: string | null;
  recommendations?: string | null;
  comment?: string | null;
}

export interface EvaluationSummaryFilters {
  supervisorId: string;
  year: number;
  bimester: number;
  groupId?: string;
}

export interface InspectionGalleryPhoto {
  id: string;
  url: string;
  thumbUrl: string | null;
  storageKey: string | null;
  clientRef: string | null;
  createdAt: string;
  inspectionId: string;
  inspectionStatus: "non_soumis" | "soumis" | "verifie" | "rejete";
  submittedAt: string | null;

  formType: {
    id: string;
    code: string;
    name: string;
  };

  group: {
    id: string;
    name: string;
  };

  submittedBy: {
    id: string;
    displayName: string;
  } | null;

  item: {
    id: string;
    label: string;
  };

  segment: {
    id: string;
    label: string;
  } | null;

  ouvrage: string | null;
}

export interface InspectionGalleryResponse {
  photos: InspectionGalleryPhoto[];
  total: number;
}

/* =========================================================
   API
========================================================= */

function baseUrl(): string {
  if (!API_URL) {
    throw new Error("VITE_AUTH_API_URL n'est pas défini — impossible d'appeler l'API.");
  }

  return API_URL.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  return `${baseUrl()}${path}`;
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    credentials: "include",

    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },

    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });

    throw new ApiError(res.status, body.error ?? `Erreur HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  /* =======================================================
     GENERIC
  ======================================================= */

  get: <T = unknown>(path: string) => apiFetch<T>(path),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, {
      method: "DELETE",
    }),

  /* =======================================================
     DASHBOARD
  ======================================================= */

  dashboardStats: (filters?: DashboardFilters) => {
    const params = new URLSearchParams();

    if (filters?.year && filters.year !== "all") {
      params.set("year", filters.year);
    }

    if (filters?.bimester && filters.bimester !== "all") {
      params.set("bimester", filters.bimester);
    }

    if (filters?.group && filters.group !== "all") {
      params.set("group", filters.group);
    }

    if (filters?.formTypeId && filters.formTypeId !== "all") {
      params.set("formTypeId", filters.formTypeId);
    }

    const query = params.toString();

    return apiFetch<DashboardStats>(`/api/dashboard/stats${query ? `?${query}` : ""}`);
  },

  /* =======================================================
     EVALUATIONS
  ======================================================= */

  /**
   * Liste des superviseurs évaluables.
   */
  evaluationSupervisors: () => apiFetch<EvaluationSupervisor[]>("/api/evaluations/supervisors"),

  /**
   * Calcule les performances réelles
   * d'un superviseur pour une période.
   */
  evaluationSummary: (filters: EvaluationSummaryFilters) => {
    const params = new URLSearchParams();

    params.set("supervisorId", filters.supervisorId);

    params.set("year", String(filters.year));

    params.set("bimester", String(filters.bimester));

    if (filters.groupId && filters.groupId !== "all") {
      params.set("groupId", filters.groupId);
    }

    return apiFetch<EvaluationSummary>(`/api/evaluations/summary?${params.toString()}`);
  },

  /**
   * Historique des évaluations.
   */
  evaluations: () => apiFetch<Evaluation[]>("/api/evaluations"),

  /**
   * Une évaluation.
   */
  evaluation: (id: string) => apiFetch<Evaluation>(`/api/evaluations/${id}`),
  updateEvaluation: (id: string, payload: Partial<CreateEvaluationPayload>) =>
    apiFetch<Evaluation>(`/api/evaluations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  myEvaluation: () => apiFetch<Evaluation | null>("/api/evaluations/my"),

  inspectionGallery: () => apiFetch<InspectionGalleryResponse>("/api/inspections/gallery"),

  /**
   * Créer une évaluation.
   */
  createEvaluation: (payload: CreateEvaluationPayload) =>
    apiFetch<Evaluation>("/api/evaluations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
