import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings, accounts, settings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { fetchStooqQuote } from "@/lib/stooq";
import { fetchTwelveDataQuotesInBatches } from "@/lib/twelve-data";
import { fetchEodhdQuote } from "@/lib/eodhd";
import { roundForStorage } from "@/lib/format";
import { runMutationWithNetvalue } from "@/lib/mutation-with-netvalue";

const TWELVE_BATCH_SIZE = 8;
const TWELVE_BATCH_DELAY_MS = 65000;

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function getTickerSource(ticker: string): "stooq" | "asia" | null {
  if (ticker.endsWith(".US") || ticker.endsWith(".JP")) return "stooq";
  if (ticker.endsWith(".SS") || ticker.endsWith(".SZ") || ticker.endsWith(".HK")) return "asia";
  return null;
}

interface AsiaTickerProfile {
  normalizedTicker: string;
  twelveCandidates: Array<{
    symbol: string;
    exchange?: "HKEX" | "SSE" | "SZSE";
  }>;
  eodhdSymbol: string;
}

function toStooqSymbol(normalizedTicker: string): string {
  const lastDot = normalizedTicker.lastIndexOf(".");
  if (lastDot <= 0) return normalizedTicker.toLowerCase();
  const code = normalizedTicker.slice(0, lastDot).replaceAll(".", "-");
  const market = normalizedTicker.slice(lastDot + 1);
  return `${code}.${market}`.toLowerCase();
}

function parseAsiaTicker(ticker: string): AsiaTickerProfile | null {
  const normalizedTicker = normalizeTicker(ticker);
  const [rawCode, suffix] = normalizedTicker.split(".");
  if (!rawCode || !suffix) return null;

  const digitsOnly = rawCode.replace(/\D/g, "");
  if (!digitsOnly) return null;

  if (suffix === "HK") {
    const code = digitsOnly.padStart(4, "0");
    return {
      normalizedTicker: `${code}.HK`,
      twelveCandidates: [
        { symbol: `${code}.HK` },
        { symbol: `${code}.HKEX` },
        { symbol: code, exchange: "HKEX" },
      ],
      eodhdSymbol: `${code}.HK`,
    };
  }

  if (suffix === "SS") {
    const code = digitsOnly.padStart(6, "0");
    return {
      normalizedTicker: `${code}.SS`,
      twelveCandidates: [
        { symbol: `${code}.SSE` },
        { symbol: code, exchange: "SSE" },
        { symbol: `${code}.SS` },
      ],
      eodhdSymbol: `${code}.SHG`,
    };
  }

  if (suffix === "SZ") {
    const code = digitsOnly.padStart(6, "0");
    return {
      normalizedTicker: `${code}.SZ`,
      twelveCandidates: [
        { symbol: `${code}.SZSE` },
        { symbol: code, exchange: "SZSE" },
        { symbol: `${code}.SZ` },
      ],
      eodhdSymbol: `${code}.SHE`,
    };
  }

  return null;
}

interface HoldingForPrice {
  id: number;
  name: string;
  ticker: string | null;
  valuationMode: "amount" | "shares";
  shares: number;
  price: number;
}

interface UpdatedItem {
  id: number;
  name: string;
  ticker: string;
  oldPrice: number;
  newPrice: number;
  provider: string;
  source: "realtime" | "previous_close";
}

interface FailedItem {
  id: number;
  name: string;
  ticker: string;
  error: string;
}

interface SkippedItem {
  id: number;
  name: string;
  ticker: string | null;
  reason: string;
}

async function applyQuoteToHolding(
  h: HoldingForPrice,
  ticker: string,
  newPriceRaw: number,
  provider: string,
  source: "realtime" | "previous_close",
  updated: UpdatedItem[]
) {
  const oldPrice = h.price;
  const newPrice = roundForStorage(newPriceRaw, "price");
  const newMarketValue = roundForStorage(h.shares * newPrice, "amount");

  await db
    .update(holdings)
    .set({
      price: newPrice,
      marketValue: newMarketValue,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(holdings.id, h.id));

  updated.push({
    id: h.id,
    name: h.name,
    ticker,
    oldPrice,
    newPrice,
    provider,
    source,
  });
}

export async function POST() {
  const { userId, response: authResponse } = await requireUser();
  if (!userId) return authResponse;

  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const accountIds = userAccounts.map((a: { id: number }) => a.id);
  if (accountIds.length === 0) {
    return NextResponse.json({ updated: [], failed: [], skipped: [] });
  }

  const allHoldings = await db
    .select()
    .from(holdings)
    .where(inArray(holdings.accountId, accountIds));

  const holdingRows = allHoldings as HoldingForPrice[];
  const updated: UpdatedItem[] = [];
  const failed: FailedItem[] = [];
  const skipped: SkippedItem[] = [];

  const stooqHoldings: {
    holding: HoldingForPrice;
    stooqSymbol: string;
    normalizedTicker: string;
  }[] = [];
  const asiaHoldings: { holding: HoldingForPrice; profile: AsiaTickerProfile }[] = [];

  for (const h of holdingRows) {
    if (h.valuationMode !== "shares") {
      skipped.push({ id: h.id, name: h.name, ticker: h.ticker, reason: "amount 模式" });
      continue;
    }
    if (!h.ticker) {
      skipped.push({ id: h.id, name: h.name, ticker: null, reason: "无股票代码" });
      continue;
    }

    const normalizedTicker = normalizeTicker(h.ticker);
    const source = getTickerSource(normalizedTicker);
    if (source === "stooq") {
      stooqHoldings.push({
        holding: h,
        stooqSymbol: toStooqSymbol(normalizedTicker),
        normalizedTicker,
      });
      continue;
    }

    if (source === "asia") {
      const profile = parseAsiaTicker(normalizedTicker);
      if (!profile) {
        skipped.push({ id: h.id, name: h.name, ticker: h.ticker, reason: "代码格式无法识别" });
        continue;
      }
      asiaHoldings.push({ holding: h, profile });
      continue;
    }

    skipped.push({ id: h.id, name: h.name, ticker: h.ticker, reason: "不支持的代码格式" });
  }

  for (const item of stooqHoldings) {
    const { holding: h, stooqSymbol, normalizedTicker } = item;
    try {
      const quote = await fetchStooqQuote(stooqSymbol);
      if (quote && quote.close > 0) {
        await applyQuoteToHolding(h, normalizedTicker, quote.close, "stooq", "realtime", updated);
      } else {
        failed.push({ id: h.id, name: h.name, ticker: normalizedTicker, error: "Stooq 无数据" });
      }
    } catch {
      failed.push({ id: h.id, name: h.name, ticker: normalizedTicker, error: "Stooq 请求失败" });
    }
  }

  if (asiaHoldings.length > 0) {
    const userSettingsRows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(eq(settings.userId, userId));
    const userSettings = new Map<string, string>(
      userSettingsRows.map((row: { key: string; value: string }) => [row.key, row.value])
    );

    const twelveApiKey = (userSettings.get("quote_api.twelvedata_key") ?? "").trim();
    const eodhdApiKey = (userSettings.get("quote_api.eodhd_key") ?? "").trim();

    if (!twelveApiKey && !eodhdApiKey) {
      for (const { holding: h, profile } of asiaHoldings) {
        failed.push({
          id: h.id,
          name: h.name,
          ticker: profile.normalizedTicker,
          error: "未配置 Twelve Data / EODHD API Key",
        });
      }
    } else {
      const unresolvedById = new Map(asiaHoldings.map((item) => [item.holding.id, item]));

      if (twelveApiKey) {
        const twelveResults = await fetchTwelveDataQuotesInBatches(
          twelveApiKey,
          asiaHoldings.map(({ holding, profile }) => ({
            requestId: String(holding.id),
            candidates: profile.twelveCandidates,
          })),
          { batchSize: TWELVE_BATCH_SIZE, batchDelayMs: TWELVE_BATCH_DELAY_MS }
        );

        for (const result of twelveResults) {
          const holdingId = Number.parseInt(result.requestId, 10);
          const item = unresolvedById.get(holdingId);
          if (!item || !result.quote) continue;

          await applyQuoteToHolding(
            item.holding,
            item.profile.normalizedTicker,
            result.quote.price,
            "twelve-data",
            result.quote.source,
            updated
          );
          unresolvedById.delete(holdingId);
        }
      }

      if (unresolvedById.size > 0 && eodhdApiKey) {
        for (const [holdingId, item] of unresolvedById.entries()) {
          const quote = await fetchEodhdQuote(eodhdApiKey, item.profile.eodhdSymbol);
          if (!quote) continue;

          await applyQuoteToHolding(
            item.holding,
            item.profile.normalizedTicker,
            quote.price,
            "eodhd",
            quote.source,
            updated
          );
          unresolvedById.delete(holdingId);
        }
      }

      for (const item of unresolvedById.values()) {
        failed.push({
          id: item.holding.id,
          name: item.holding.name,
          ticker: item.profile.normalizedTicker,
          error: eodhdApiKey
            ? "Twelve Data / EODHD 均未返回可用价格"
            : "Twelve Data 无数据，且未配置 EODHD API Key",
        });
      }
    }
  }

  const resultResponse = NextResponse.json({ updated, failed, skipped });
  if (updated.length === 0) {
    return resultResponse;
  }
  return runMutationWithNetvalue(userId, async () => resultResponse);
}
