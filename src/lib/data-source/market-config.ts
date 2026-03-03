// 市场指数静态配置（客户端/服务端共用，无 Node.js 依赖）

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  tradingViewSymbol: string;
  tradingViewUrl: string;
  group: string;
}

/**
 * 数据源类型：
 * - "stooq": Stooq CSV API（美股/日股/VIX/HSI）
 * - "yahoo": yahoo-finance2（A 股/港股/恒生科技）
 * - null: 无可用数据源
 */
export type DataSource = "stooq" | "yahoo" | null;

export interface IndexConfigItem {
  source: DataSource;
  sourceSymbol: string | null;
  name: string;
  tradingView: string;
  group: string;
}

// 指数配置：source + sourceSymbol 标记数据源和对应符号
export const INDEX_CONFIG: IndexConfigItem[] = [
  // 美股（Stooq）
  {
    source: "stooq",
    sourceSymbol: "^spx",
    name: "S&P 500",
    tradingView: "FOREXCOM:SPXUSD",
    group: "🇺🇸 美股",
  },
  {
    source: "stooq",
    sourceSymbol: "^ndq",
    name: "纳斯达克100",
    tradingView: "NASDAQ:NDX",
    group: "🇺🇸 美股",
  },
  {
    source: "stooq",
    sourceSymbol: "^dji",
    name: "道琼斯",
    tradingView: "DJ:DJI",
    group: "🇺🇸 美股",
  },
  // A股（Yahoo）
  {
    source: "yahoo",
    sourceSymbol: "000300.SS",
    name: "沪深300",
    tradingView: "SSE:000300",
    group: "🇨🇳 A股",
  },
  {
    source: "yahoo",
    sourceSymbol: "000001.SS",
    name: "上证指数",
    tradingView: "SSE:000001",
    group: "🇨🇳 A股",
  },
  {
    source: "yahoo",
    sourceSymbol: "399006.SZ",
    name: "创业板指",
    tradingView: "SZSE:399006",
    group: "🇨🇳 A股",
  },
  {
    source: "yahoo",
    sourceSymbol: "000905.SS",
    name: "中证500",
    tradingView: "SSE:000905",
    group: "🇨🇳 A股",
  },
  // 港股
  {
    source: "stooq",
    sourceSymbol: "^hsi",
    name: "恒生指数",
    tradingView: "HSI:HSI",
    group: "🇭🇰 港股",
  },
  {
    source: "yahoo",
    sourceSymbol: "^HSTECH",
    name: "恒生科技",
    tradingView: "TVC:HSTECH",
    group: "🇭🇰 港股",
  },
  // 日股
  {
    source: "stooq",
    sourceSymbol: "^nkx",
    name: "日经225",
    tradingView: "TVC:NI225",
    group: "🇯🇵 日股",
  },
  {
    source: null,
    sourceSymbol: null,
    name: "东证指数",
    tradingView: "TSE:TOPIX",
    group: "🇯🇵 日股",
  },
  // 波动
  {
    source: "stooq",
    sourceSymbol: "^vix",
    name: "VIX 恐慌指数",
    tradingView: "CBOE:VIX",
    group: "📉 波动",
  },
];
