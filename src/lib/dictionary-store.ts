/**
 * Store générique pour les dictionnaires éditables par l'admin (sprint "Gestion
 * des modèles de formulaires") : familles/types de dégradation, catalogue de
 * fiches, checklist bâtiment A→H.
 *
 * Principes :
 *  - Les valeurs par défaut (celles codées dans les fichiers *-catalog.ts /
 *    *-checklist.ts) restent la référence tant qu'aucune modification n'a été
 *    enregistrée — l'app fonctionne à l'identique sans admin.
 *  - Toute modification est persistée en localStorage et prend effet
 *    immédiatement, sans redéploiement (AC "Faire évoluer une fiche sans
 *    redéploiement").
 *  - Chaque écriture incrémente un numéro de version. Les fiches soumises
 *    enregistrent la version en vigueur au moment de la soumission (voir
 *    performSubmit dans les écrans superviseur) — une édition ultérieure du
 *    dictionnaire n'altère donc pas rétroactivement une fiche déjà soumise
 *    (AC "versionnement du modèle"). Limite assumée : sans backend, on ne
 *    conserve pas un instantané complet de chaque version passée, seulement
 *    son numéro — la reconstruction fidèle d'une ancienne version nécessitera
 *    un stockage serveur des snapshots.
 */

export type VersionedDictionary<T> = {
  /** Valeurs actuelles : override enregistré si présent, sinon les valeurs par défaut. */
  current: () => T;
  /** Numéro de version actuel (0 = valeurs par défaut, jamais modifiées). */
  version: () => number;
  /** Enregistre de nouvelles valeurs et incrémente la version. */
  save: (next: T) => number;
  /** Revient aux valeurs par défaut (incrémente aussi la version, par traçabilité). */
  resetToDefaults: () => number;
  /** true si un override est enregistré (valeurs différentes des valeurs par défaut). */
  isCustomized: () => boolean;
};

export function createVersionedDictionary<T>(key: string, defaults: T): VersionedDictionary<T> {
  const dataKey = `las.dict.${key}`;
  const versionKey = `las.dict.${key}.version`;

  const readVersion = (): number => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem(versionKey) ?? "0");
  };

  const readOverride = (): T | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(dataKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };

  return {
    current: () => readOverride() ?? defaults,
    version: readVersion,
    isCustomized: () => readOverride() !== null,
    save: (next: T) => {
      if (typeof window === "undefined") return readVersion();
      window.localStorage.setItem(dataKey, JSON.stringify(next));
      const v = readVersion() + 1;
      window.localStorage.setItem(versionKey, String(v));
      return v;
    },
    resetToDefaults: () => {
      if (typeof window === "undefined") return readVersion();
      window.localStorage.removeItem(dataKey);
      const v = readVersion() + 1;
      window.localStorage.setItem(versionKey, String(v));
      return v;
    },
  };
}
