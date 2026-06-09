/**
 * Yahoo Finance 数据获取层封装（yahoo-finance2 v3，仅服务端使用）
 *
 * 用于美股持仓报价主路由，以及 A 股(.SS/.SZ)、港股(.HK) 等后续可扩展场景。
 * 本地网络环境可能触发 Yahoo crumb 403，调用方应准备回退数据源。
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface YahooQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}

function toIsoDatetime(value: unknown): string {
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

function parseYahooQuote(q: Record<string, unknown>): YahooQuote | null {
  if (!q.symbol || typeof q.regularMarketPrice !== "number") return null;

  return {
    symbol: String(q.symbol),
    price: q.regularMarketPrice,
    change: typeof q.regularMarketChange === "number" ? q.regularMarketChange : 0,
    changePercent:
      typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : 0,
    updatedAt: toIsoDatetime(q.regularMarketTime),
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
