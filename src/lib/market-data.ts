/**
 * 市场指数数据获取（双数据源：Stooq + Yahoo，仅服务端使用）
 *
 * 按 INDEX_CONFIG 中每个指数的 source 字段分发请求：
 * - "stooq" → Stooq CSV API（美股/日股/VIX/HSI）
 * - "yahoo" → yahoo-finance2（A 股/港股/恒生科技）
 * - null → 跳过，返回空价格
 */

import { INDEX_CONFIG, type MarketIndex, type IndexConfigItem } from "./market-config";
import { fetchStooqQuote } from "./stooq";
import { fetchYahooQuotes } from "./yahoo";

// 重新导出供 API route 和前端使用
export { type MarketIndex, INDEX_CONFIG } from "./market-config";

/** 构建空价格的 MarketIndex（静态骨架兜底） */
function buildEmptyIndex(config: IndexConfigItem): MarketIndex {
  return {
    symbol: config.sourceSymbol ?? config.name,
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
  // 按数据源分组
  const stooqConfigs = INDEX_CONFIG.filter((c) => c.source === "stooq" && c.sourceSymbol);
  const yahooConfigs = INDEX_CONFIG.filter((c) => c.source === "yahoo" && c.sourceSymbol);

  // 并行请求两个数据源（互不影响）
  const [stooqResults, yahooResults] = await Promise.all([
    // Stooq: 逐个请求
    Promise.all(
      stooqConfigs.map(async (config) => {
        const quote = await fetchStooqQuote(config.sourceSymbol!);
        return { config, quote };
      })
    ).catch(() => [] as { config: IndexConfigItem; quote: null }[]),

    // Yahoo: 批量请求
    (async () => {
      const symbols = yahooConfigs.map((c) => c.sourceSymbol!);
      return fetchYahooQuotes(symbols);
    })().catch(() => []),
  ]);

  // 构建 Stooq 结果 Map（sourceSymbol → quote）
  const stooqMap = new Map<string, MarketIndex>();
  for (const { config, quote } of stooqResults) {
    if (quote) {
      stooqMap.set(config.sourceSymbol!, {
        symbol: config.sourceSymbol!,
        name: config.name,
        price: quote.close,
        change: 0, // Stooq CSV 不直接提供涨跌，前端可从 TradingView 获取
        changePercent: 0,
        updatedAt: quote.date && quote.time ? `${quote.date}T${quote.time}` : quote.date || "",
        tradingViewSymbol: config.tradingView,
        tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${config.tradingView}`,
        group: config.group,
      });
    }
  }

  // 构建 Yahoo 结果 Map（symbol → quote）
  const yahooMap = new Map<string, MarketIndex>();
  for (const yq of yahooResults) {
    // 找到对应的 config
    const config = yahooConfigs.find((c) => c.sourceSymbol === yq.symbol);
    if (config) {
      yahooMap.set(config.sourceSymbol!, {
        symbol: config.sourceSymbol!,
        name: config.name,
        price: yq.price,
        change: yq.change,
        changePercent: yq.changePercent,
        updatedAt: yq.updatedAt,
        tradingViewSymbol: config.tradingView,
        tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${config.tradingView}`,
        group: config.group,
      });
    }
  }

  // 按 INDEX_CONFIG 顺序合并结果
  return INDEX_CONFIG.map((config) => {
    if (config.source === "stooq" && config.sourceSymbol) {
      return stooqMap.get(config.sourceSymbol) ?? buildEmptyIndex(config);
    }
    if (config.source === "yahoo" && config.sourceSymbol) {
      return yahooMap.get(config.sourceSymbol) ?? buildEmptyIndex(config);
    }
    // source === null
    return buildEmptyIndex(config);
  });
}
