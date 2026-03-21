export const REQUIRED_EXCHANGE_RATE_PAIRS = ["USD/CNY", "HKD/CNY"] as const;

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  "USD/CNY": 7.2,
  "HKD/CNY": 0.92,
};

export interface ExchangeRateCacheEntry {
  rate: number;
  updatedAt: string;
}

export interface ExchangeRateLookupResult {
  rates: Record<string, number>;
  updatedAt: string;
  source: "cache" | "stale_cache" | "default";
}

export function isExchangeRateFresh(updatedAt: string, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return updatedAt.slice(0, 10) === today;
}

export function getFreshExchangeRateResult(
  cacheMap: Record<string, ExchangeRateCacheEntry>,
  now = new Date()
): ExchangeRateLookupResult | null {
  const allFresh = REQUIRED_EXCHANGE_RATE_PAIRS.every((pair) => {
    const cached = cacheMap[pair];
    return cached && isExchangeRateFresh(cached.updatedAt, now);
  });

  if (!allFresh) {
    return null;
  }

  return {
    rates: Object.fromEntries(
      REQUIRED_EXCHANGE_RATE_PAIRS.map((pair) => [pair, cacheMap[pair].rate])
    ),
    updatedAt: cacheMap["USD/CNY"].updatedAt,
    source: "cache",
  };
}

export function getFallbackExchangeRateResult(
  cacheMap: Record<string, ExchangeRateCacheEntry>
): ExchangeRateLookupResult {
  const rates: Record<string, number> = {};
  let hasDefaultRate = false;
  let latestCachedUpdatedAt = "";

  for (const pair of REQUIRED_EXCHANGE_RATE_PAIRS) {
    const cached = cacheMap[pair];
    if (cached) {
      rates[pair] = cached.rate;
      if (!latestCachedUpdatedAt) {
        latestCachedUpdatedAt = cached.updatedAt;
      }
      continue;
    }

    rates[pair] = DEFAULT_EXCHANGE_RATES[pair];
    hasDefaultRate = true;
  }

  return {
    rates,
    updatedAt: hasDefaultRate ? "default" : latestCachedUpdatedAt,
    source: hasDefaultRate ? "default" : "stale_cache",
  };
}
