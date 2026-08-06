import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { flushQueue, readQueue, startQueueReplay, subscribeQueue } from "@/lib/offline-queue";
import { useI18n } from "@/lib/i18n";

/** Bandeau d'état réseau + file d'attente de soumissions différées. */
export function OfflineIndicator() {
  const { lang } = useI18n();
  const t = (fr: string, en: string) => (lang === "fr" ? fr : en);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(readQueue().length);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsubscribe = subscribeQueue((q) => setPending(q.length));
    const stopReplay = startQueueReplay();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsubscribe();
      stopReplay();
    };
  }, []);

  if (online && pending === 0) return null;

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
