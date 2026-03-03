"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { publishInvalidateBroadcast } from "@/lib/cache/broadcast";
import { emitInvalidate } from "@/lib/cache/events";
import { fetchJson } from "@/lib/cache/http";
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

interface MutationJsonOptions<TBody> {
  path: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  body?: TBody;
  mutationName: CacheMutationName;
}

export function useMutationJson<TBody = unknown, TResult = unknown>() {
  const { invalidateByMutation } = useInvalidateMutation();

  return useMutation({
    mutationFn: async ({ path, method, body }: MutationJsonOptions<TBody>) =>
      fetchJson<TResult>(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body == null ? undefined : JSON.stringify(body),
      }),
    onSuccess: async (_, variables) => {
      await invalidateByMutation(variables.mutationName);
    },
  });
}
