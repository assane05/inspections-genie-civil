const DRAFT_PREFIX = "las.draft.";
const QUEUE_KEY = "las.submission.queue";

export type QueuedSubmission = {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH";
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** "network" = coupure/latence, retry silencieux illimité tant qu'on est hors-ligne.
   *  "server" = le serveur a explicitement rejeté (4xx) : pas la peine de rejouer
   *  indéfiniment sans intervention, cf. isStuck. */
  lastErrorKind?: "network" | "server";
};

/** Au-delà, un échec "server" n'est plus rejoué automatiquement — cf. isStuck. */
export const MAX_AUTO_RETRY_ATTEMPTS = 8;

export function isStuck(item: QueuedSubmission): boolean {
  return item.lastErrorKind === "server" && item.attempts >= MAX_AUTO_RETRY_ATTEMPTS;
}

type Listener = (queue: QueuedSubmission[]) => void;
const listeners = new Set<Listener>();

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readQueue(): QueuedSubmission[] {
  if (typeof window === "undefined") return [];
  return safeParse<QueuedSubmission[]>(window.localStorage.getItem(QUEUE_KEY), []);
}

function writeQueue(queue: QueuedSubmission[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    // QuotaExceededError notamment : mieux vaut prévenir l'appelant (et donc
    // l'utilisateur) que perdre silencieusement la donnée/la photo en file.
    throw new Error(
      `Espace de stockage local insuffisant pour mettre en file (${queue.length} élément(s) en attente) : ${(err as Error).message}`,
    );
  }
  listeners.forEach((l) => l(queue));
}

export function subscribeQueue(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** --- Brouillons de formulaire (sauvegarde locale immédiate) --- */

export function saveDraft(formId: string, data: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_PREFIX + formId, JSON.stringify({ data, savedAt: Date.now() }));
}

export function loadDraft<T = unknown>(formId: string): { data: T; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  return safeParse<{ data: T; savedAt: number } | null>(
    window.localStorage.getItem(DRAFT_PREFIX + formId),
    null,
  );
}

export function clearDraft(formId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_PREFIX + formId);
}

/** --- File d'attente de soumissions --- */
export function enqueueSubmission(
  endpoint: string,
  payload: unknown,
  method: "POST" | "PATCH" = "POST",
): QueuedSubmission {
  const item: QueuedSubmission = {
    id: crypto.randomUUID(),
    endpoint,
    method,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  writeQueue([...readQueue(), item]);
  void flushQueue();
  return item;
}

let flushing = false;

export async function flushQueue(): Promise<{ sent: number; remaining: number; stuck: number }> {
  if (typeof window === "undefined") return { sent: 0, remaining: 0, stuck: 0 };
  const stuckCount = () => readQueue().filter(isStuck).length;
  if (flushing || !navigator.onLine) {
    return { sent: 0, remaining: readQueue().length, stuck: stuckCount() };
  }
  flushing = true;
  let sent = 0;
  try {
    let queue = readQueue();
    for (const item of [...queue]) {
      // Une coupure détectée en cours de vidage arrête cette passe (inutile
      // d'enchaîner des fetch voués à l'échec) — mais un item DÉJÀ en échec
      // (isolé, ex. 422 sur un seul défaut) ne doit jamais empêcher les
      // suivants d'être envoyés : c'était le bug précédent (break au lieu de
      // continue), qui pouvait bloquer toute la file derrière un seul item
      // cassé.
      if (!navigator.onLine) break;
      if (isStuck(item)) continue;

      try {
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...(item.payload as object), idempotencyKey: item.id }),
        });
        if (!res.ok) {
          const kind: "network" | "server" = res.status >= 500 ? "network" : "server";
          throw Object.assign(new Error(`HTTP ${res.status}`), { kind });
        }
        queue = queue.filter((q) => q.id !== item.id);
        sent += 1;
      } catch (error) {
        const kind =
          (error as { kind?: "network" | "server" }).kind === "server" ? "server" : "network";
        queue = queue.map((q) =>
          q.id === item.id
            ? {
                ...q,
                attempts: q.attempts + 1,
                lastError: String((error as Error).message),
                lastErrorKind: kind,
              }
            : q,
        );
      }
      writeQueue(queue);
    }
    writeQueue(queue);
    return { sent, remaining: queue.length, stuck: queue.filter(isStuck).length };
  } finally {
    flushing = false;
  }
}

/** Remet un item bloqué en file d'attente normale et tente un envoi immédiat. */
export function retryStuckItem(id: string) {
  const queue = readQueue().map((q) =>
    q.id === id ? { ...q, attempts: 0, lastError: undefined, lastErrorKind: undefined } : q,
  );
  writeQueue(queue);
  void flushQueue();
}

/** Abandon définitif d'un item — action manuelle et explicite uniquement (jamais automatique). */
export function discardQueueItem(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

/** Rejoue automatiquement la file dès que le réseau revient. */
export function startQueueReplay() {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => void flushQueue();
  window.addEventListener("online", onOnline);
  const interval = window.setInterval(() => {
    if (navigator.onLine && readQueue().length > 0) void flushQueue();
  }, 30_000);
  onOnline();
  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(interval);
  };
}
