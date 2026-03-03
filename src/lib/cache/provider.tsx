"use client";

import { useEffect, useMemo, useState } from "react";
import { createStore, del, get, set } from "idb-keyval";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

import { subscribeInvalidateBroadcast } from "@/lib/cache/broadcast";
import { emitSyncFailure, subscribeInvalidate } from "@/lib/cache/events";
import { isUnauthorizedError } from "@/lib/cache/http";
import {
  buildUserQueryScope,
  CACHE_NAMESPACE,
  CACHE_PERSIST_TIME_MS,
  CACHE_SCHEMA_VERSION,
  CACHE_STALE_TIME_MS,
  isUserQueryKey,
} from "@/lib/cache/policy";

const cacheStore = createStore("investmanage-cache-db", "query-persist");
const persistKey = `${CACHE_NAMESPACE}-${CACHE_SCHEMA_VERSION}-persist`;

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => {
      const value = await get<string>(key, cacheStore);
      return value ?? null;
    },
    setItem: async (key: string, value: string) => {
      await set(key, value, cacheStore);
    },
    removeItem: async (key: string) => {
      await del(key, cacheStore);
    },
  },
  key: persistKey,
  throttleTime: 1000,
});

let activeQueryClient: QueryClient | null = null;

function clearQueryCacheByUser(queryClient: QueryClient, userId?: string | null) {
  if (!userId) return;
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && isUserQueryKey(key) && key[2] === userId;
    },
  });
}

export async function clearAllClientCache() {
  activeQueryClient?.clear();
  await persister.removeClient();
}

export async function clearCurrentUserClientCache(userId?: string | null) {
  if (!activeQueryClient || !userId) return;
  clearQueryCacheByUser(activeQueryClient, userId);
  await persister.removeClient();
}

function createQueryClient() {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      if (isUnauthorizedError(error)) {
        const key = query.queryKey;
        if (Array.isArray(key) && isUserQueryKey(key) && activeQueryClient) {
          clearQueryCacheByUser(activeQueryClient, key[2]);
        }
        void clearAllClientCache();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return;
      }

      if (query.state.data !== undefined) {
        emitSyncFailure();
      }
    },
  });

  return new QueryClient({
    queryCache,
    defaultOptions: {
      queries: {
        staleTime: CACHE_STALE_TIME_MS,
        gcTime: CACHE_PERSIST_TIME_MS,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  const persistOptions = useMemo(
    () => ({
      persister,
      maxAge: CACHE_PERSIST_TIME_MS,
      buster: `${CACHE_NAMESPACE}:${CACHE_SCHEMA_VERSION}`,
    }),
    []
  );

  useEffect(() => {
    activeQueryClient = queryClient;
    return () => {
      if (activeQueryClient === queryClient) {
        activeQueryClient = null;
      }
    };
  }, [queryClient]);

  useEffect(() => {
    const invalidate = (payload: { userId: string; queries: readonly string[] }) => {
      for (const name of payload.queries) {
        queryClient.invalidateQueries({
          queryKey: buildUserQueryScope(
            payload.userId,
            name as Parameters<typeof buildUserQueryScope>[1]
          ),
        });
      }
    };

    const unsubLocal = subscribeInvalidate((payload) => invalidate(payload));
    const unsubBroadcast = subscribeInvalidateBroadcast((payload) => invalidate(payload));

    return () => {
      unsubLocal();
      unsubBroadcast();
    };
  }, [queryClient]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
