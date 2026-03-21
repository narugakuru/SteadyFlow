import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getFallbackExchangeRateResult,
  getFreshExchangeRateResult,
} from "@/lib/services/exchange-rate-cache";
import { roundForStorage } from "@/lib/utils/format";

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
  const cached = await db.select().from(exchangeRates);
  const cacheMap: Record<string, { rate: number; updatedAt: string }> = {};
  for (const row of cached) {
    cacheMap[row.currencyPair] = { rate: row.rate, updatedAt: row.updatedAt };
  }

  const freshResult = getFreshExchangeRateResult(cacheMap);
  if (freshResult) {
    return freshResult;
  }

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

  return getFallbackExchangeRateResult(cacheMap);
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
