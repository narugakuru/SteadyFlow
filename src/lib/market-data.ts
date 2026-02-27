// 市场指数数据获取（yahoo-finance2 v3，仅服务端使用）

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinance = require("yahoo-finance2").default;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

import { INDEX_CONFIG, type MarketIndex, type IndexConfigItem } from "./market-config";

// 重新导出供 API route 使用
export { type MarketIndex, INDEX_CONFIG } from "./market-config";

/** yahoo-finance2 quote 返回的单条数据 */
interface YFQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | string;
}

/** 构建空价格的 MarketIndex（静态骨架兜底） */
function buildEmptyIndex(config: IndexConfigItem): MarketIndex {
  return {
    symbol: config.yahoo,
    name: config.name,
    price: 0,
    change: 0,
    changePercent: 0,
    updatedAt: "",
    tradingViewSymbol: config.tradingView,
    tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${config.tradingView}`,
    group: config.group,
  };
}

export async function fetchMarketData(): Promise<MarketIndex[]> {
  const symbols = INDEX_CONFIG.map((c) => c.yahoo);

  try {
    const results: YFQuote[] = await yf.quote(symbols, {}, { timeout: 10000 });
    const quotes = Array.isArray(results) ? results : [results];

    const quoteMap = new Map<string, YFQuote>();
    for (const q of quotes) {
      if (q && q.symbol) quoteMap.set(q.symbol, q);
    }

    return INDEX_CONFIG.map((config) => {
      const q = quoteMap.get(config.yahoo);
      if (!q) return buildEmptyIndex(config);

      return {
        symbol: config.yahoo,
        name: config.name,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        updatedAt: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : "",
        tradingViewSymbol: config.tradingView,
        tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${config.tradingView}`,
        group: config.group,
      };
    });
  } catch {
    // API 失败时返回完整列表但价格为空，确保前端表格骨架可渲染
    return INDEX_CONFIG.map(buildEmptyIndex);
  }
}
