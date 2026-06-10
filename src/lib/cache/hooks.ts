"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { publishInvalidateBroadcast } from "@/lib/cache/broadcast";
import { emitInvalidate, emitSyncFailure } from "@/lib/cache/events";
import { fetchJson } from "@/lib/cache/http";
import {
  restoreOptimisticSnapshots,
  type MutationJsonVariables,
  type OptimisticMutationConfig,
  type OptimisticSnapshot,
} from "@/lib/cache/optimistic";
import {
  buildUserQueryKey,
  buildUserQueryScope,
  MUTATION_INVALIDATES,
  QUERY_POLICIES,
  type CacheMutationName,
  type CacheQueryName,
} from "@/lib/cache/policy";

interface UserScopedQueryOptions {
  name: CacheQueryName;
  path: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  enabled?: boolean;
}

export function useUserScopedQuery<TData>({
  name,
  path,
  params,
  enabled = true,
}: UserScopedQueryOptions) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const policy = QUERY_POLICIES[name];

  const query = useQuery({
    queryKey: userId ? buildUserQueryKey(userId, name, params) : ["disabled", name],
    queryFn: () => fetchJson<TData>(path),
    enabled: enabled && status !== "loading" && !!userId,
    staleTime: policy.staleTimeMs,
    gcTime: policy.persistTimeMs,
    refetchOnWindowFocus: policy.refetchOnWindowFocus,
    refetchOnReconnect: policy.refetchOnReconnect,
  });

  return {
    ...query,
    userId,
    sessionStatus: status,
  };
}

export function useInvalidateMutation() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const invalidateByMutation = useCallback(
    async (mutationName: CacheMutationName) => {
      if (!userId) return;
      const targets = MUTATION_INVALIDATES[mutationName] ?? [];
      for (const queryName of targets) {
        await queryClient.invalidateQueries({
          queryKey: buildUserQueryScope(userId, queryName),
        });
      }
      emitInvalidate({ userId, queries: targets });
      publishInvalidateBroadcast(userId, targets);
    },
    [queryClient, userId]
  );

  return { invalidateByMutation, userId };
}

interface MutationContext {
  snapshots: OptimisticSnapshot[];
}

function createTempId() {
  return -Math.max(1, Math.floor(Date.now() + Math.random() * 1000));
}

export function useMutationJson<TBody = unknown, TResult = unknown>() {
  const { invalidateByMutation, userId } = useInvalidateMutation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, method, body }: MutationJsonVariables<TBody>) =>
      fetchJson<TResult>(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body == null ? undefined : JSON.stringify(body),
      }),
    onMutate: async (variables): Promise<MutationContext> => {
      const optimistic = variables.optimistic as OptimisticMutationConfig<TBody> | undefined;
      if (!userId || !optimistic) return { snapshots: [] };

      const targets = optimistic.queries ?? MUTATION_INVALIDATES[variables.mutationName] ?? [];
      const snapshots: OptimisticSnapshot[] = [];
      const queryEntriesByName = new Map<CacheQueryName, Array<[readonly unknown[], unknown]>>();
      const tempId = createTempId();

      const readQueryData = <TData>(queryName: CacheQueryName) => {
        const match = queryEntriesByName.get(queryName)?.[0];
        return match?.[1] as TData | undefined;
      };

      for (const queryName of targets) {
        const scope = buildUserQueryScope(userId, queryName);
        await queryClient.cancelQueries({ queryKey: scope });
        queryEntriesByName.set(queryName, queryClient.getQueriesData({ queryKey: scope }));
      }

      for (const queryName of targets) {
        const queryEntries = queryEntriesByName.get(queryName) ?? [];
        for (const [queryKey, previous] of queryEntries) {
          snapshots.push({ queryKey, data: previous });
          const next = optimistic.update({
            queryName,
            queryKey,
            previous,
            variables,
            tempId,
            readQueryData,
          });
          if (next !== previous) {
            queryClient.setQueryData(queryKey, next);
          }
        }
      }

      return { snapshots };
    },
    onError: (_error, variables, context) => {
      restoreOptimisticSnapshots(context?.snapshots ?? [], (queryKey, data) =>
        queryClient.setQueryData(queryKey, data)
      );
      if (variables.optimistic) {
        emitSyncFailure("操作未保存，已回滚到本地缓存");
      }
    },
    onSuccess: async (_, variables) => {
      if (!variables.optimistic) {
        await invalidateByMutation(variables.mutationName);
      }
    },
    onSettled: async (_data, _error, variables) => {
      if (variables.optimistic) {
        await invalidateByMutation(variables.mutationName);
      }
    },
  });
}
