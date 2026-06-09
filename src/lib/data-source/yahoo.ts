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

/**
 * 批量获取多个 Yahoo 符号的行情
 * @returns 成功获取的数据列表，失败时返回空列表不抛异常
 */
export async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];

  try {
    const results = await yf.quote(symbols, {}, { timeout: 10000 });
    const quotes = Array.isArray(results) ? results : [results];

    return quotes
      .filter(
        (q: Record<string, unknown>) => q && q.symbol && typeof q.regularMarketPrice === "number"
      )
      .map(
        (q: {
          symbol: string;
          regularMarketPrice: number;
          regularMarketChange?: number;
          regularMarketChangePercent?: number;
          regularMarketTime?: Date | string;
        }) => ({
          symbol: q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          updatedAt: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : "",
        })
      );
  } catch {
    return [];
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
