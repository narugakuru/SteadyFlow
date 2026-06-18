import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { getExchangeRates } from "@/lib/data-source/exchange-rate";
import { fetchEodhdQuotesInBatches } from "@/lib/data-source/eodhd";
import {
  fetchTencentQuotesInBatches,
  toTencentSimpleQuoteSymbol,
} from "@/lib/data-source/tencent-quote";
import { fetchTwelveDataQuotesInBatches } from "@/lib/data-source/twelve-data";
import { fetchYahooQuote } from "@/lib/data-source/yahoo";
import {
  markQuoteSyncFinished,
  markQuoteSyncStarted,
} from "@/lib/services/quote-sync-metadata-service";
import { getQuoteRefreshScopeSkipReason } from "@/lib/services/quote-refresh-scope";
import { readUserSettingsMap, SETTING_KEYS } from "@/lib/services/settings-service";
import { roundForStorage } from "@/lib/utils/format";
import type { QuoteSyncTriggerSource } from "@/lib/utils/quote-sync";

const TWELVE_BATCH_SIZE = 8;
const TENCENT_BATCH_SIZE = 30;
const TENCENT_MAX_RETRIES = 1;
const EODHD_BATCH_SIZE = 10;

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function getTickerSource(ticker: string): "us" | "asia" | null {
  if (ticker.endsWith(".US")) return "us";
  if (
    ticker.endsWith(".SS") ||
    ticker.endsWith(".SZ") ||
    ticker.endsWith(".HK") ||
    ticker.endsWith(".BJ")
  ) {
    return "asia";
  }
  return null;
}

interface UsTickerProfile {
  normalizedTicker: string;
  yahooSymbol: string;
  eodhdSymbol: string;
}

interface AsiaTickerProfile {
  normalizedTicker: string;
  tencentSymbol: string;
  twelveCandidates: Array<{
    symbol: string;
    exchange?: string;
  }>;
  eodhdSymbol: string;
}

function parseUsTicker(ticker: string): UsTickerProfile | null {
  const normalizedTicker = normalizeTicker(ticker);
  const lastDot = normalizedTicker.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const code = normalizedTicker.slice(0, lastDot);
  const market = normalizedTicker.slice(lastDot + 1);
  if (market !== "US" || !code) return null;

  const vendorCode = code.replaceAll(".", "-");
  return {
    normalizedTicker,
    yahooSymbol: vendorCode,
    eodhdSymbol: `${vendorCode}.US`,
  };
}

function parseAsiaTicker(ticker: string): AsiaTickerProfile | null {
  const normalizedTicker = normalizeTicker(ticker);
  const [rawCode, suffix] = normalizedTicker.split(".");
  if (!rawCode || !suffix) return null;

  const tencentSymbol = toTencentSimpleQuoteSymbol(normalizedTicker);
  if (!tencentSymbol) return null;

  const digitsOnly = rawCode.replace(/\D/g, "");
  if (!digitsOnly) return null;

  if (suffix === "HK") {
    const code = digitsOnly.padStart(4, "0");
    return {
      normalizedTicker: `${code}.HK`,
      tencentSymbol,
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
      tencentSymbol,
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
      tencentSymbol,
      twelveCandidates: [
        { symbol: `${code}.SZSE` },
        { symbol: code, exchange: "SZSE" },
        { symbol: `${code}.SZ` },
      ],
      eodhdSymbol: `${code}.SHE`,
    };
  }

  if (suffix === "BJ") {
    const code = digitsOnly.padStart(6, "0");
    return {
      normalizedTicker: `${code}.BJ`,
      tencentSymbol,
      twelveCandidates: [{ symbol: `${code}.BJ` }, { symbol: code, exchange: "BSE" }],
      eodhdSymbol: `${code}.BJ`,
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

export interface UpdatedItem {
  id: number;
  name: string;
  ticker: string;
  oldPrice: number;
  newPrice: number;
  provider: string;
  source: "realtime";
}

export interface FailedItem {
  id: number;
  name: string;
  ticker: string;
  error: string;
}

export interface SkippedItem {
  id: number;
  name: string;
  ticker: string | null;
  reason: string;
}

export type QuoteSyncStatus = "ok" | "partial" | "failed";

export interface UserQuoteSyncResult {
  updated: UpdatedItem[];
  failed: FailedItem[];
  skipped: SkippedItem[];
  exchangeRates: {
    updatedAt: string;
    source: "cache" | "api" | "stale_cache" | "default";
  };
  quoteSyncStatus: QuoteSyncStatus;
  quoteFailureSummary: string | null;
  stats: {
    updated: number;
    failed: number;
    skipped: number;
    total: number;
  };
}

interface SyncHoldingPriceOptions {
  trigger?: QuoteSyncTriggerSource;
}

function formatErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function resolveQuoteSyncStatus(updatedCount: number, failedCount: number): QuoteSyncStatus {
  if (failedCount === 0) return "ok";
  if (updatedCount > 0) return "partial";
  return "failed";
}

function summarizeFailureReasons(failed: FailedItem[]): string | null {
  if (failed.length === 0) return null;

  const counts = new Map<string, number>();
  for (const item of failed) {
    counts.set(item.error, (counts.get(item.error) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => (count > 1 ? `${reason} x${count}` : reason))
    .join(" | ");
}

function getEodhdApiKey(settingMap: ReadonlyMap<string, string>) {
  return (settingMap.get(SETTING_KEYS.eodhdApiKey) ?? "").trim();
}

function buildQuoteSyncSummary(result: Pick<UserQuoteSyncResult, "stats" | "quoteFailureSummary">) {
  const parts = [
    `成功 ${result.stats.updated} 个`,
    `失败 ${result.stats.failed} 个`,
    `跳过 ${result.stats.skipped} 个`,
  ];

  if (result.quoteFailureSummary) {
    parts.push(`摘要：${result.quoteFailureSummary}`);
  }

  return parts.join("，");
}

async function applyQuoteToHolding(
  holding: HoldingForPrice,
  ticker: string,
  newPriceRaw: number,
  provider: string,
  source: "realtime",
  updated: UpdatedItem[]
) {
  const oldPrice = holding.price;
  const newPrice = roundForStorage(newPriceRaw, "price");
  const newMarketValue = roundForStorage(holding.shares * newPrice, "amount");

  await db
    .update(holdings)
    .set({
      price: newPrice,
      marketValue: newMarketValue,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(holdings.id, holding.id));

  updated.push({
    id: holding.id,
    name: holding.name,
    ticker,
    oldPrice,
    newPrice,
    provider,
    source,
  });
}

export async function syncHoldingPricesForUser(
  userId: string,
  options: SyncHoldingPriceOptions = {}
): Promise<UserQuoteSyncResult> {
  const trigger = options.trigger ?? "manual";
  await markQuoteSyncStarted(userId, trigger);

  try {
    const exchangeRates = await getExchangeRates();
    const userAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const accountIds = userAccounts.map((account: { id: number }) => account.id);
    if (accountIds.length === 0) {
      const result: UserQuoteSyncResult = {
        updated: [],
        failed: [],
        skipped: [],
        exchangeRates: {
          updatedAt: exchangeRates.updatedAt,
          source: exchangeRates.source,
        },
        quoteSyncStatus: "ok",
        quoteFailureSummary: null,
        stats: { updated: 0, failed: 0, skipped: 0, total: 0 },
      };
      await markQuoteSyncFinished(userId, {
        trigger,
        status: result.quoteSyncStatus,
        summary: buildQuoteSyncSummary(result),
        hadSuccessfulUpdate: false,
      });
      return result;
    }

    const allHoldings = await db
      .select()
      .from(holdings)
      .where(inArray(holdings.accountId, accountIds));

    const holdingRows = allHoldings as HoldingForPrice[];
    const updated: UpdatedItem[] = [];
    const failed: FailedItem[] = [];
    const skipped: SkippedItem[] = [];

    const usHoldings: {
      holding: HoldingForPrice;
      profile: UsTickerProfile;
    }[] = [];
    const asiaHoldings: { holding: HoldingForPrice; profile: AsiaTickerProfile }[] = [];

    for (const holding of holdingRows) {
      const scopeSkipReason = getQuoteRefreshScopeSkipReason(holding);
      if (scopeSkipReason) {
        skipped.push({
          id: holding.id,
          name: holding.name,
          ticker: holding.ticker,
          reason: scopeSkipReason,
        });
        continue;
      }
      if (!holding.ticker) {
        skipped.push({
          id: holding.id,
          name: holding.name,
          ticker: null,
          reason: "无股票代码",
        });
        continue;
      }

      const normalizedTicker = normalizeTicker(holding.ticker);
      const source = getTickerSource(normalizedTicker);
      if (source === "us") {
        const profile = parseUsTicker(normalizedTicker);
        if (!profile) {
          skipped.push({
            id: holding.id,
            name: holding.name,
            ticker: holding.ticker,
            reason: "代码格式无法识别",
          });
          continue;
        }
        usHoldings.push({ holding, profile });
        continue;
      }

      if (source === "asia") {
        const profile = parseAsiaTicker(normalizedTicker);
        if (!profile) {
          skipped.push({
            id: holding.id,
            name: holding.name,
            ticker: holding.ticker,
            reason: "代码格式无法识别",
          });
          continue;
        }
        asiaHoldings.push({ holding, profile });
        continue;
      }

      skipped.push({
        id: holding.id,
        name: holding.name,
        ticker: holding.ticker,
        reason: "不支持的代码格式",
      });
    }

    const needsProviderSettings = usHoldings.length > 0 || asiaHoldings.length > 0;
    const userSettings = needsProviderSettings ? await readUserSettingsMap(userId) : new Map();
    const eodhdApiKey = getEodhdApiKey(userSettings);
    const twelveApiKey = (userSettings.get(SETTING_KEYS.twelveDataApiKey) ?? "").trim();

    const unresolvedUsById = new Map<
      number,
      { holding: HoldingForPrice; profile: UsTickerProfile }
    >();
    const yahooErrorById = new Map<number, string>();
    const usEodhdErrorById = new Map<number, string>();

    for (const item of usHoldings) {
      try {
        const quote = await fetchYahooQuote(item.profile.yahooSymbol);
        if (quote && quote.price > 0) {
          await applyQuoteToHolding(
            item.holding,
            item.profile.normalizedTicker,
            quote.price,
            "yahoo-finance2",
            "realtime",
            updated
          );
          continue;
        } else {
          yahooErrorById.set(item.holding.id, "无可用价格");
        }
      } catch (error) {
        yahooErrorById.set(item.holding.id, formatErrorMessage(error, "Yahoo Finance 请求失败"));
      }

      unresolvedUsById.set(item.holding.id, item);
    }

    if (unresolvedUsById.size > 0 && eodhdApiKey) {
      const eodhdResults = await fetchEodhdQuotesInBatches(
        eodhdApiKey,
        [...unresolvedUsById.values()].map(({ holding, profile }) => ({
          requestId: String(holding.id),
          symbol: profile.eodhdSymbol,
        })),
        { batchSize: EODHD_BATCH_SIZE }
      );

      for (const result of eodhdResults) {
        const holdingId = Number.parseInt(result.requestId, 10);
        const item = unresolvedUsById.get(holdingId);
        if (!item) continue;

        if (!result.quote) {
          usEodhdErrorById.set(holdingId, result.error ?? "无可用价格");
          continue;
        }

        await applyQuoteToHolding(
          item.holding,
          item.profile.normalizedTicker,
          result.quote.price,
          "eodhd",
          result.quote.source,
          updated
        );
        unresolvedUsById.delete(holdingId);
      }
    }

    for (const item of unresolvedUsById.values()) {
      const holdingId = item.holding.id;
      failed.push({
        id: item.holding.id,
        name: item.holding.name,
        ticker: item.profile.normalizedTicker,
        error: [
          `Yahoo Finance: ${yahooErrorById.get(holdingId) ?? "无可用价格"}`,
          eodhdApiKey
            ? `EODHD: ${usEodhdErrorById.get(holdingId) ?? "无可用价格"}`
            : "EODHD: 未配置 API Key",
        ].join("；"),
      });
    }

    if (asiaHoldings.length > 0) {
      const unresolvedById = new Map(asiaHoldings.map((item) => [item.holding.id, item]));
      const tencentErrorById = new Map<number, string>();
      const eodhdErrorById = new Map<number, string>();
      const twelveErrorById = new Map<number, string>();

      try {
        const tencentResults = await fetchTencentQuotesInBatches(
          asiaHoldings.map(({ holding, profile }) => ({
            requestId: String(holding.id),
            symbol: profile.tencentSymbol,
          })),
          { batchSize: TENCENT_BATCH_SIZE, maxRetries: TENCENT_MAX_RETRIES }
        );

        for (const result of tencentResults) {
          const holdingId = Number.parseInt(result.requestId, 10);
          const item = unresolvedById.get(holdingId);
          if (!item) continue;

          if (!result.quote) {
            if (result.error) {
              tencentErrorById.set(holdingId, result.error);
            }
            continue;
          }

          await applyQuoteToHolding(
            item.holding,
            item.profile.normalizedTicker,
            result.quote.price,
            "tencent",
            result.quote.source,
            updated
          );
          unresolvedById.delete(holdingId);
        }
      } catch (error) {
        const reason = formatErrorMessage(error, "腾讯行情请求失败");
        for (const item of unresolvedById.values()) {
          tencentErrorById.set(item.holding.id, reason);
        }
      }

      if (unresolvedById.size > 0 && eodhdApiKey) {
        const eodhdResults = await fetchEodhdQuotesInBatches(
          eodhdApiKey,
          [...unresolvedById.values()].map(({ holding, profile }) => ({
            requestId: String(holding.id),
            symbol: profile.eodhdSymbol,
          })),
          { batchSize: EODHD_BATCH_SIZE }
        );

        for (const result of eodhdResults) {
          const holdingId = Number.parseInt(result.requestId, 10);
          const item = unresolvedById.get(holdingId);
          if (!item) continue;

          if (!result.quote) {
            eodhdErrorById.set(holdingId, result.error ?? "无可用价格");
            continue;
          }

          await applyQuoteToHolding(
            item.holding,
            item.profile.normalizedTicker,
            result.quote.price,
            "eodhd",
            result.quote.source,
            updated
          );
          unresolvedById.delete(holdingId);
        }
      }

      if (unresolvedById.size > 0 && twelveApiKey) {
        try {
          const twelveResults = await fetchTwelveDataQuotesInBatches(
            twelveApiKey,
            [...unresolvedById.values()].map(({ holding, profile }) => ({
              requestId: String(holding.id),
              candidates: profile.twelveCandidates,
            })),
            { batchSize: TWELVE_BATCH_SIZE }
          );

          for (const result of twelveResults) {
            const holdingId = Number.parseInt(result.requestId, 10);
            const item = unresolvedById.get(holdingId);
            if (!item) continue;

            if (!result.quote) {
              if (result.error) {
                twelveErrorById.set(holdingId, result.error);
              }
              continue;
            }

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
        } catch (error) {
          const reason = formatErrorMessage(error, "Twelve Data 请求失败");
          for (const item of unresolvedById.values()) {
            twelveErrorById.set(item.holding.id, reason);
          }
        }
      }

      for (const item of unresolvedById.values()) {
        const holdingId = item.holding.id;
        const reasons: string[] = [];
        reasons.push(`Tencent: ${tencentErrorById.get(holdingId) ?? "无可用价格"}`);
        reasons.push(
          eodhdApiKey
            ? `EODHD: ${eodhdErrorById.get(holdingId) ?? "无可用价格"}`
            : "EODHD: 未配置 API Key"
        );
        reasons.push(
          twelveApiKey
            ? `Twelve Data: ${twelveErrorById.get(holdingId) ?? "无可用价格"}`
            : "Twelve Data: 未配置 API Key"
        );

        failed.push({
          id: holdingId,
          name: item.holding.name,
          ticker: item.profile.normalizedTicker,
          error: reasons.join("；"),
        });
      }
    }

    const quoteSyncStatus = resolveQuoteSyncStatus(updated.length, failed.length);
    const result: UserQuoteSyncResult = {
      updated,
      failed,
      skipped,
      exchangeRates: {
        updatedAt: exchangeRates.updatedAt,
        source: exchangeRates.source,
      },
      quoteSyncStatus,
      quoteFailureSummary: summarizeFailureReasons(failed),
      stats: {
        updated: updated.length,
        failed: failed.length,
        skipped: skipped.length,
        total: updated.length + failed.length + skipped.length,
      },
    };
    await markQuoteSyncFinished(userId, {
      trigger,
      status: result.quoteSyncStatus,
      summary: buildQuoteSyncSummary(result),
      hadSuccessfulUpdate: result.stats.updated > 0,
    });
    return result;
  } catch (error) {
    await markQuoteSyncFinished(userId, {
      trigger,
      status: "failed",
      summary: `报价同步异常：${formatErrorMessage(error, "未知错误")}`,
      hadSuccessfulUpdate: false,
    });
    throw error;
  }
}
