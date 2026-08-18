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
};

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
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  listeners.forEach((l) => l(queue));
}

export function subscribeQueue(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
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

export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  if (typeof window === "undefined") return { sent: 0, remaining: 0 };
  if (flushing || !navigator.onLine) return { sent: 0, remaining: readQueue().length };
  flushing = true;
  let sent = 0;
  try {
    let queue = readQueue();
    for (const item of [...queue]) {
      try {
        const res = await fetch(item.endpoint, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...(item.payload as object), idempotencyKey: item.id }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        queue = queue.filter((q) => q.id !== item.id);
        sent += 1;
      } catch (error) {
        queue = queue.map((q) =>
          q.id === item.id
            ? { ...q, attempts: q.attempts + 1, lastError: String((error as Error).message) }
            : q,
        );
        break;
      }
      writeQueue(queue);
    }
    writeQueue(queue);
    return { sent, remaining: queue.length };
  } finally {
    flushing = false;
  }
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
