"use client";

export const CACHE_NAMESPACE = "im";
export const CACHE_SCHEMA_VERSION = "v1";
export const CACHE_STALE_TIME_MS = 60 * 1000;
export const CACHE_PERSIST_TIME_MS = 3 * 24 * 60 * 60 * 1000;

export type CacheQueryName =
  | "asset-allocation"
  | "accounts"
  | "holdings"
  | "transactions"
  | "settings"
  | "netvalue"
  | "market"
  | "admin-stats"
  | "asset-classes";

export type CacheMutationName =
  | "accounts-write"
  | "holdings-write"
  | "transactions-write"
  | "batch-update-write"
  | "fetch-prices-write"
  | "settings-write";

export interface QueryPolicy {
  staleTimeMs: number;
  persistTimeMs: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
}

const BASE_POLICY: QueryPolicy = {
  staleTimeMs: CACHE_STALE_TIME_MS,
  persistTimeMs: CACHE_PERSIST_TIME_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

export const QUERY_POLICIES: Record<CacheQueryName, QueryPolicy> = {
  "asset-allocation": BASE_POLICY,
  accounts: BASE_POLICY,
  holdings: BASE_POLICY,
  transactions: BASE_POLICY,
  settings: BASE_POLICY,
  netvalue: BASE_POLICY,
  market: BASE_POLICY,
  "admin-stats": BASE_POLICY,
  "asset-classes": BASE_POLICY,
};

export const MUTATION_INVALIDATES: Record<CacheMutationName, CacheQueryName[]> = {
  "accounts-write": ["accounts", "asset-allocation", "netvalue"],
  "holdings-write": ["holdings", "accounts", "asset-allocation", "netvalue", "transactions"],
  "transactions-write": ["transactions", "holdings", "accounts", "asset-allocation", "netvalue"],
  "batch-update-write": ["holdings", "accounts", "asset-allocation", "netvalue"],
  "fetch-prices-write": ["holdings", "accounts", "asset-allocation", "netvalue"],
  "settings-write": ["asset-allocation"],
};

type QueryParams = Record<string, string | number | boolean | null | undefined>;

function serializeParams(params?: QueryParams): string {
  if (!params) return "default";
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return entries.length ? entries.join("&") : "default";
}

export function buildUserQueryKey(userId: string, query: CacheQueryName, params?: QueryParams) {
  return [CACHE_NAMESPACE, CACHE_SCHEMA_VERSION, userId, query, serializeParams(params)] as const;
}

export function buildUserQueryScope(userId: string, query: CacheQueryName) {
  return [CACHE_NAMESPACE, CACHE_SCHEMA_VERSION, userId, query] as const;
}

export function isUserQueryKey(key: readonly unknown[]): key is readonly [string, string, string] {
  return (
    key.length >= 3 &&
    key[0] === CACHE_NAMESPACE &&
    key[1] === CACHE_SCHEMA_VERSION &&
    typeof key[2] === "string"
  );
}
