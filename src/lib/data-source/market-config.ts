// 市场页静态配置（客户端/服务端共用，无 Node.js 依赖）

export const MARKET_GROUPS = ["🇺🇸 美股", "🇨🇳 A股", "🇭🇰 港股", "🇯🇵 日股"] as const;

export type MarketGroup = (typeof MARKET_GROUPS)[number];
export type MarketSnapshotProvider = "stooq-history" | "tencent";
export type MarketHistoryProvider = "stooq";

export interface MarketIndexSnapshot {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  group: MarketGroup;
  source: "stooq" | "tencent";
  externalUrl: string;
}

export interface MarketVixPoint {
  date: string;
  close: number;
}

export interface MarketVixData {
  latest: number | null;
  latestAt: string | null;
  series: MarketVixPoint[];
}

export interface MarketAthDrawdown {
  id: string;
  name: string;
  lastAllTimeHighDate: string | null;
  drawdownPercent: number | null;
  statusEmoji: string | null;
}

export interface MarketApiResponse {
  indices: MarketIndexSnapshot[];
  vix: MarketVixData;
  athDrawdowns: MarketAthDrawdown[];
  updatedAt: string;
}

export interface MarketIndexConfigItem {
  id: string;
  symbol: string;
  name: string;
  group: MarketGroup;
  provider: MarketSnapshotProvider;
  sourceSymbol: string;
  externalUrl: string;
}

export interface MarketAthConfigItem {
  id: string;
  name: string;
  provider: MarketHistoryProvider;
  sourceSymbol: string;
}

export const MARKET_INDEX_CONFIG: MarketIndexConfigItem[] = [
  {
    id: "sp500",
    symbol: "^spx",
    name: "S&P 500",
    group: "🇺🇸 美股",
    provider: "stooq-history",
    sourceSymbol: "^spx",
    externalUrl: "https://stooq.com/q/?s=%5Espx",
  },
  {
    id: "nasdaq100",
    symbol: "^ndq",
    name: "纳斯达克100",
    group: "🇺🇸 美股",
    provider: "stooq-history",
    sourceSymbol: "^ndq",
    externalUrl: "https://stooq.com/q/?s=%5Endq",
  },
  {
    id: "dow-jones",
    symbol: "^dji",
    name: "道琼斯",
    group: "🇺🇸 美股",
    provider: "stooq-history",
    sourceSymbol: "^dji",
    externalUrl: "https://stooq.com/q/?s=%5Edji",
  },
  {
    id: "csi300",
    symbol: "000300.SS",
    name: "沪深300",
    group: "🇨🇳 A股",
    provider: "tencent",
    sourceSymbol: "s_sh000300",
    externalUrl: "https://gu.qq.com/sh000300/zs",
  },
  {
    id: "shanghai-composite",
    symbol: "000001.SS",
    name: "上证指数",
    group: "🇨🇳 A股",
    provider: "tencent",
    sourceSymbol: "s_sh000001",
    externalUrl: "https://gu.qq.com/sh000001/zs",
  },
  {
    id: "chinext",
    symbol: "399006.SZ",
    name: "创业板指",
    group: "🇨🇳 A股",
    provider: "tencent",
    sourceSymbol: "s_sz399006",
    externalUrl: "https://gu.qq.com/sz399006/zs",
  },
  {
    id: "csi500",
    symbol: "000905.SS",
    name: "中证500",
    group: "🇨🇳 A股",
    provider: "tencent",
    sourceSymbol: "s_sh000905",
    externalUrl: "https://gu.qq.com/sh000905/zs",
  },
  {
    id: "hang-seng",
    symbol: "HSI",
    name: "恒生指数",
    group: "🇭🇰 港股",
    provider: "tencent",
    sourceSymbol: "s_hkHSI",
    externalUrl: "https://gu.qq.com/hkHSI/zs",
  },
  {
    id: "hang-seng-tech",
    symbol: "HSTECH",
    name: "恒生科技",
    group: "🇭🇰 港股",
    provider: "tencent",
    sourceSymbol: "s_hkHSTECH",
    externalUrl: "https://gu.qq.com/hkHSTECH/zs",
  },
  {
    id: "nikkei225",
    symbol: "^nkx",
    name: "日经225",
    group: "🇯🇵 日股",
    provider: "stooq-history",
    sourceSymbol: "^nkx",
    externalUrl: "https://stooq.com/q/?s=%5Enkx",
  },
];

export const MARKET_ATH_CONFIG: MarketAthConfigItem[] = [
  { id: "bitcoin", name: "Bitcoin", provider: "stooq", sourceSymbol: "btc.v" },
  { id: "dax", name: "DAX", provider: "stooq", sourceSymbol: "^dax" },
  {
    id: "dow-jones-industrial-average",
    name: "Dow Jones Industrial Average",
    provider: "stooq",
    sourceSymbol: "^dji",
  },
  {
    id: "ftse-all-world",
    name: "FTSE All-World",
    provider: "stooq",
    sourceSymbol: "vwrl.uk",
  },
  { id: "gold", name: "Gold", provider: "stooq", sourceSymbol: "xauusd" },
  { id: "msci-world", name: "MSCI World", provider: "stooq", sourceSymbol: "urth.us" },
  {
    id: "nasdaq-composite",
    name: "Nasdaq Composite",
    provider: "stooq",
    sourceSymbol: "oneq.us",
  },
  { id: "nasdaq-100", name: "Nasdaq-100", provider: "stooq", sourceSymbol: "^ndq" },
  { id: "nikkei-225", name: "Nikkei 225", provider: "stooq", sourceSymbol: "^nkx" },
  { id: "sp500-ath", name: "S&P 500", provider: "stooq", sourceSymbol: "^spx" },
  { id: "smi", name: "SMI", provider: "stooq", sourceSymbol: "^smi" },
];
