import { useEffect, useState } from "react";
import { AlertTriangle, CloudOff, RefreshCw, WifiOff } from "lucide-react";
import {
  discardQueueItem,
  flushQueue,
  isStuck,
  readQueue,
  retryStuckItem,
  startQueueReplay,
  subscribeQueue,
  type QueuedSubmission,
} from "@/lib/offline-queue";
import { useI18n } from "@/lib/i18n";

/** Bandeau d'état réseau + file d'attente de soumissions différées. */
export function OfflineIndicator() {
  const { lang } = useI18n();
  const t = (fr: string, en: string) => (lang === "fr" ? fr : en);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedSubmission[]>([]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueue(readQueue());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsubscribe = subscribeQueue(setQueue);
    const stopReplay = startQueueReplay();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsubscribe();
      stopReplay();
    };
  }, []);

  const stuckItems = queue.filter(isStuck);
  const pending = queue.length - stuckItems.length;

  if (online && queue.length === 0) return null;

  // Échec persistant (le serveur a rejeté, pas juste "hors-ligne") : bandeau
  // distinct, message non technique, action manuelle — jamais de détail
  // d'erreur brut affiché à l'utilisateur.
  if (stuckItems.length > 0) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>
          {t(
            `${stuckItems.length} modification(s) n'ont pas pu être envoyées — vérifiez votre connexion et réessayez.`,
            `${stuckItems.length} change(s) could not be sent — check your connection and retry.`,
          )}
        </span>
        <button
          type="button"
          onClick={() => stuckItems.forEach((item) => retryStuckItem(item.id))}
          className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2 py-0.5 hover:bg-destructive/20"
        >
          <RefreshCw className="h-3 w-3" />
          {t("Réessayer", "Retry")}
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                t(
                  "Abandonner définitivement cette modification non envoyée ? Cette action est irréversible.",
                  "Permanently discard this unsent change? This cannot be undone.",
                ),
              )
            ) {
              stuckItems.forEach((item) => discardQueueItem(item.id));
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2 py-0.5 hover:bg-destructive/20"
        >
          {t("Ignorer", "Discard")}
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-xs font-medium text-warning-foreground"
    >
      {online ? <CloudOff className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      <span>
        {online
          ? t(
              `${pending} soumission(s) en attente d'envoi — rejeu automatique en cours.`,
              `${pending} submission(s) queued — automatic replay in progress.`,
            )
          : t(
              `Hors connexion — vos saisies sont sauvegardées localement${pending ? ` (${pending} en attente)` : ""}.`,
              `Offline — your entries are saved locally${pending ? ` (${pending} queued)` : ""}.`,
            )}
      </span>
      {online && pending > 0 && (
        <button
          type="button"
          onClick={() => void flushQueue()}
          className="inline-flex items-center gap-1 rounded-full border border-warning/40 px-2 py-0.5 hover:bg-warning/20"
        >
          <RefreshCw className="h-3 w-3" />
          {t("Réessayer", "Retry")}
        </button>
      )}
    </div>
  );
}
