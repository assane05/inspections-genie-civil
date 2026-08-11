import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Une journée : au-delà, une donnée en cache est jugée trop ancienne pour être
// resservie hors-ligne sans prévenir l'utilisateur qu'elle peut être périmée.
const OFFLINE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: OFFLINE_CACHE_MAX_AGE,
        // Sert le cache en priorité hors-ligne au lieu d'échouer — la tâche
        // ouverte reste utilisable même sans réseau (cf. brouillons +
        // offline-queue.ts pour la soumission elle-même).
        networkMode: "offlineFirst",
        retry: 1,
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  // localStorage n'existe pas côté serveur (SSR) — persistance uniquement client.
  if (typeof window !== "undefined") {
    persistQueryClient({
      queryClient,
      persister: createSyncStoragePersister({
        storage: window.localStorage,
        key: "las.query-cache",
      }),
      maxAge: OFFLINE_CACHE_MAX_AGE,
    });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
