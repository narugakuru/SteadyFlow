// Yahoo Finance 非官方 API 获取指数行情数据

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  tradingViewUrl: string;
}

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
}

// Yahoo Finance symbol → 显示信息映射
const INDEX_CONFIG: {
  yahoo: string;
  name: string;
  tradingView: string;
  group: string;
}[] = [
  // 美股
  { yahoo: "^GSPC", name: "S&P 500", tradingView: "FOREXCOM:SPXUSD", group: "🇺🇸 美股" },
  { yahoo: "^NDX", name: "纳斯达克100", tradingView: "NASDAQ:NDX", group: "🇺🇸 美股" },
  { yahoo: "^DJI", name: "道琼斯", tradingView: "DJ:DJI", group: "🇺🇸 美股" },
  // A股
  { yahoo: "000300.SS", name: "沪深300", tradingView: "SSE:000300", group: "🇨🇳 A股" },
  { yahoo: "000001.SS", name: "上证指数", tradingView: "SSE:000001", group: "🇨🇳 A股" },
  { yahoo: "399006.SZ", name: "创业板指", tradingView: "SZSE:399006", group: "🇨🇳 A股" },
  { yahoo: "000905.SS", name: "中证500", tradingView: "SSE:000905", group: "🇨🇳 A股" },
  // 港股
  { yahoo: "^HSI", name: "恒生指数", tradingView: "HSI:HSI", group: "🇭🇰 港股" },
  { yahoo: "^HSTECH", name: "恒生科技", tradingView: "TVC:HSTECH", group: "🇭🇰 港股" },
  // 日股
  { yahoo: "^N225", name: "日经225", tradingView: "TVC:NI225", group: "🇯🇵 日股" },
  { yahoo: "^TOPX", name: "东证指数", tradingView: "TSE:TOPIX", group: "🇯🇵 日股" },
  // 波动
  { yahoo: "^VIX", name: "VIX 恐慌指数", tradingView: "CBOE:VIX", group: "📉 波动" },
];

export function getIndexConfig() {
  return INDEX_CONFIG;
}

export async function fetchMarketData(): Promise<MarketIndex[]> {
  const symbols = INDEX_CONFIG.map((c) => c.yahoo).join(",");

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const quotes: YahooQuote[] = data?.quoteResponse?.result ?? [];

    const quoteMap = new Map<string, YahooQuote>();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q);
    }

    return INDEX_CONFIG.map((config) => {
      const q = quoteMap.get(config.yahoo);
      return {
        symbol: config.yahoo,
        name: config.name,
        price: q?.regularMarketPrice ?? 0,
        change: q?.regularMarketChange ?? 0,
        changePercent: q?.regularMarketChangePercent ?? 0,
        updatedAt: q?.regularMarketTime
          ? new Date(q.regularMarketTime * 1000).toISOString()
          : "",
        tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${config.tradingView}`,
      };
    });
  } catch {
    return [];
  }
}
