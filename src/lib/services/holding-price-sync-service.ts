import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { fetchEodhdQuote } from "@/lib/data-source/eodhd";
import { fetchStooqQuote } from "@/lib/data-source/stooq";
import {
  fetchTencentQuotesInBatches,
  toTencentSimpleQuoteSymbol,
} from "@/lib/data-source/tencent-quote";
import { fetchTwelveDataQuotesInBatches } from "@/lib/data-source/twelve-data";
import {
  markQuoteSyncFinished,
  markQuoteSyncStarted,
} from "@/lib/services/quote-sync-metadata-service";
import { readUserSettingsMap, SETTING_KEYS } from "@/lib/services/settings-service";
import { roundForStorage } from "@/lib/utils/format";
import type { QuoteSyncTriggerSource } from "@/lib/utils/quote-sync";

const TWELVE_BATCH_SIZE = 8;
const TENCENT_BATCH_SIZE = 30;
const TENCENT_MAX_RETRIES = 1;

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function getTickerSource(ticker: string): "stooq" | "asia" | null {
  if (ticker.endsWith(".US") || ticker.endsWith(".JP")) return "stooq";
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

interface AsiaTickerProfile {
  normalizedTicker: string;
  tencentSymbol: string;
  twelveCandidates: Array<{
    symbol: string;
    exchange?: string;
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
  source: "realtime" | "previous_close";
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
  source: "realtime" | "previous_close",
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

    const stooqHoldings: {
      holding: HoldingForPrice;
      stooqSymbol: string;
      normalizedTicker: string;
    }[] = [];
    const asiaHoldings: { holding: HoldingForPrice; profile: AsiaTickerProfile }[] = [];

    for (const holding of holdingRows) {
      if (holding.valuationMode !== "shares") {
        skipped.push({
          id: holding.id,
          name: holding.name,
          ticker: holding.ticker,
          reason: "amount 模式",
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
      if (source === "stooq") {
        stooqHoldings.push({
          holding,
          stooqSymbol: toStooqSymbol(normalizedTicker),
          normalizedTicker,
        });
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

    for (const item of stooqHoldings) {
      try {
        const quote = await fetchStooqQuote(item.stooqSymbol);
        if (quote && quote.close > 0) {
          await applyQuoteToHolding(
            item.holding,
            item.normalizedTicker,
            quote.close,
            "stooq",
            "realtime",
            updated
          );
        } else {
          failed.push({
            id: item.holding.id,
            name: item.holding.name,
            ticker: item.normalizedTicker,
            error: "Stooq 无数据",
          });
        }
      } catch (error) {
        failed.push({
          id: item.holding.id,
          name: item.holding.name,
          ticker: item.normalizedTicker,
          error: formatErrorMessage(error, "Stooq 请求失败"),
        });
      }
    }

    if (asiaHoldings.length > 0) {
      const userSettings = await readUserSettingsMap(userId);
      const twelveApiKey = (userSettings.get(SETTING_KEYS.twelveDataApiKey) ?? "").trim();
      const eodhdApiKey = (userSettings.get(SETTING_KEYS.eodhdApiKey) ?? "").trim();

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
        for (const [holdingId, item] of unresolvedById.entries()) {
          try {
            const quote = await fetchEodhdQuote(eodhdApiKey, item.profile.eodhdSymbol);
            if (!quote) {
              eodhdErrorById.set(holdingId, "无可用价格");
              continue;
            }

            await applyQuoteToHolding(
              item.holding,
              item.profile.normalizedTicker,
              quote.price,
              "eodhd",
              quote.source,
              updated
            );
            unresolvedById.delete(holdingId);
          } catch (error) {
            eodhdErrorById.set(holdingId, formatErrorMessage(error, "EODHD 请求失败"));
          }
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
