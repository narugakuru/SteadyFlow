/**
 * Yahoo Finance 数据获取层封装（yahoo-finance2 v3，仅服务端使用）
 *
 * 用于美股持仓报价主路由，以及 A 股(.SS/.SZ)、港股(.HK) 等后续可扩展场景。
 * 本地网络环境可能触发 Yahoo crumb 403，调用方应准备回退数据源。
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const YahooFinance = require("yahoo-finance2").default;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface YahooQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

type YahooPriceField = "regularMarketPrice" | "preMarketPrice" | "postMarketPrice";

const PRICE_FIELD_META: Record<
  YahooPriceField,
  { change: string; changePercent: string; time: string }
> = {
  regularMarketPrice: {
    change: "regularMarketChange",
    changePercent: "regularMarketChangePercent",
    time: "regularMarketTime",
  },
  preMarketPrice: {
    change: "preMarketChange",
    changePercent: "preMarketChangePercent",
    time: "preMarketTime",
  },
  postMarketPrice: {
    change: "postMarketChange",
    changePercent: "postMarketChangePercent",
    time: "postMarketTime",
  },
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) ? num : null;
  }
  if (value && typeof value === "object" && "raw" in value) {
    return toFiniteNumber((value as { raw?: unknown }).raw);
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const num = toFiniteNumber(value);
  return num !== null && num > 0 ? num : null;
}

function toIsoDatetime(value: unknown): string {
  if (value && typeof value === "object" && "raw" in value) {
    return toIsoDatetime((value as { raw?: unknown }).raw);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  return "";
}

function getMarketState(q: Record<string, unknown>) {
  return typeof q.marketState === "string" ? q.marketState.toUpperCase() : "";
}

function getYahooPriceFieldOrder(q: Record<string, unknown>): YahooPriceField[] {
  const state = getMarketState(q);
  if (state === "PRE" || state === "PREPRE") return ["preMarketPrice"];
  if (state === "POST" || state === "POSTPOST") return ["postMarketPrice"];
  if (state === "REGULAR") return ["regularMarketPrice"];
  if (state === "CLOSED") return ["postMarketPrice", "preMarketPrice"];
  return ["postMarketPrice", "preMarketPrice", "regularMarketPrice"];
}

function selectYahooCurrentPrice(q: Record<string, unknown>) {
  for (const field of getYahooPriceFieldOrder(q)) {
    const price = toPositiveNumber(q[field]);
    if (!price) continue;
    const meta = PRICE_FIELD_META[field];
    return {
      price,
      change: toFiniteNumber(q[meta.change]) ?? 0,
      changePercent: toFiniteNumber(q[meta.changePercent]) ?? 0,
      updatedAt: toIsoDatetime(q[meta.time]),
    };
  }
  return null;
}

export function parseYahooQuote(q: Record<string, unknown>): YahooQuote | null {
  if (!q.symbol) return null;
  const currentPrice = selectYahooCurrentPrice(q);
  if (!currentPrice) return null;

  return {
    symbol: String(q.symbol),
    price: currentPrice.price,
    change: currentPrice.change,
    changePercent: currentPrice.changePercent,
    updatedAt: currentPrice.updatedAt,
  };
}

async function fetchYahooQuotesViaQuoteSummary(symbols: string[]): Promise<YahooQuote[]> {
  const settledResults = await Promise.allSettled(
    symbols.map((symbol) => yf.quoteSummary(symbol, { modules: ["price"] }, { timeout: 10000 }))
  );

  return settledResults
    .filter(
      (result): result is PromiseFulfilledResult<{ price?: Record<string, unknown> }> =>
        result.status === "fulfilled"
    )
    .map((result) => (result.value.price ? parseYahooQuote(result.value.price) : null))
    .filter((quote): quote is YahooQuote => quote !== null);
}

/**
 * 批量获取多个 Yahoo 符号的行情
 * @returns 成功获取的数据列表，失败时返回空列表不抛异常
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];

  try {
    const results = await yf.quote(symbols, {}, { timeout: 10000 });
    const quotes = Array.isArray(results) ? results : [results];
    const parsedQuotes = quotes
      .map((q: Record<string, unknown>) => parseYahooQuote(q))
      .filter((quote: YahooQuote | null): quote is YahooQuote => quote !== null);

    const returnedSymbols = new Set(parsedQuotes.map((quote) => quote.symbol.toUpperCase()));
    const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol.toUpperCase()));
    if (missingSymbols.length === 0) return parsedQuotes;

    return [...parsedQuotes, ...(await fetchYahooQuotesViaQuoteSummary(missingSymbols))];
  } catch {
    return fetchYahooQuotesViaQuoteSummary(symbols).catch(() => []);
  }
}

/**
 * 获取单个 Yahoo 符号的最新行情
 * @returns 解析后的数据对象，失败时返回 null
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const results = await fetchYahooQuotes([symbol]);
  return results.length > 0 ? results[0] : null;
}
