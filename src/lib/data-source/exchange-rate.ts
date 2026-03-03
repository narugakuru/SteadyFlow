import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { roundForStorage } from "@/lib/utils/format";

const DEFAULT_RATES: Record<string, number> = {
  "USD/CNY": 7.2,
  "HKD/CNY": 0.92,
};

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

async function fetchRatesFromAPI(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/CNY", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== "success") return null;

    const usdRate = data.rates?.USD;
    const hkdRate = data.rates?.HKD;
    if (!usdRate || !hkdRate) return null;

    return {
      "USD/CNY": roundForStorage(1 / usdRate, "rate"),
      "HKD/CNY": roundForStorage(1 / hkdRate, "rate"),
    };
  } catch {
    return null;
  }
}

async function upsertRate(pair: string, rate: number) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.currencyPair, pair));

  if (existing) {
    await db
      .update(exchangeRates)
      .set({ rate, updatedAt: now })
      .where(eq(exchangeRates.currencyPair, pair));
  } else {
    await db.insert(exchangeRates).values({ currencyPair: pair, rate, updatedAt: now });
  }
}

export async function getExchangeRates() {
  // Check cache first
  const cached = await db.select().from(exchangeRates);
  const cacheMap: Record<string, { rate: number; updatedAt: string }> = {};
  for (const row of cached) {
    cacheMap[row.currencyPair] = { rate: row.rate, updatedAt: row.updatedAt };
  }

  // If all rates are cached and fresh today, return them
  const allFresh =
    cacheMap["USD/CNY"] &&
    cacheMap["HKD/CNY"] &&
    isToday(cacheMap["USD/CNY"].updatedAt) &&
    isToday(cacheMap["HKD/CNY"].updatedAt);

  if (allFresh) {
    return {
      rates: {
        "USD/CNY": cacheMap["USD/CNY"].rate,
        "HKD/CNY": cacheMap["HKD/CNY"].rate,
      },
      updatedAt: cacheMap["USD/CNY"].updatedAt,
      source: "cache" as const,
    };
  }

  // Try fetching from API
  const apiRates = await fetchRatesFromAPI();
  if (apiRates) {
    for (const [pair, rate] of Object.entries(apiRates)) {
      await upsertRate(pair, rate);
    }
    return {
      rates: apiRates,
      updatedAt: new Date().toISOString(),
      source: "api" as const,
    };
  }

  // Fallback to cache or defaults
  const rates: Record<string, number> = {};
  let updatedAt = "";
  for (const pair of ["USD/CNY", "HKD/CNY"]) {
    if (cacheMap[pair]) {
      rates[pair] = cacheMap[pair].rate;
      updatedAt = cacheMap[pair].updatedAt;
    } else {
      rates[pair] = DEFAULT_RATES[pair];
      updatedAt = "default";
    }
  }

  return {
    rates,
    updatedAt,
    source: (updatedAt === "default" ? "default" : "stale_cache") as "default" | "stale_cache",
  };
}

export function convertToCNY(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === "CNY") return roundForStorage(amount, "amount");
  const pair = `${currency}/CNY`;
  const rate = rates[pair] ?? 1;
  return roundForStorage(amount * rate, "amount");
}
