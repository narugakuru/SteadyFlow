export interface Account {
  id: number;
  name: string;
  currency: "CNY" | "USD" | "HKD";
  cashBalance: number;
  realizedPnl: number;
  holdingsPnl: number;
  createdAt: string;
  updatedAt: string;
  holdingsValue: number;
  holdingsCount: number;
  accountValue: number;
}

export interface Holding {
  id: number;
  accountId: number;
  name: string;
  ticker: string | null;
  valuationMode: "amount" | "shares";
  /**
   * shares 模式：平均每股成本（加权平均法），总成本 = cost × shares
   * amount 模式：总成本金额
   */
  cost: number;
  marketValue: number;
  shares: number;
  /**
   * 现价（最新市场价格）
   * 更新来源：Stooq/Yahoo 自动拉取、交易成交价、手动修正
   * shares 模式下 marketValue = shares × price
   */
  price: number;
  assetClass: string;
  accountSortOrder: number;
  disciplineSortOrder: number;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplineNote {
  id: number;
  userId: string;
  title: string;
  quote: string;
  plan: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  accountId: number;
  holdingId: number | null;
  type: "buy" | "sell" | "dividend" | "deposit" | "withdraw";
  date: string;
  amount: number;
  realizedPnl: number;
  shares: number | null;
  price: number | null;
  fee: number;
  affectCash: boolean;
  affectHolding: boolean;
  note: string | null;
  createdAt: string;
  // joined fields for display
  accountName?: string;
  accountCurrency?: string;
  holdingName?: string;
}

export interface AssetClass {
  id: number;
  name: string;
  targetPct: number;
  sortOrder: number;
}

export interface Settings {
  warningThreshold: number;
  dangerThreshold: number;
  colorMode: "cn" | "us";
  netvalueTimezone: string;
  twelveDataApiKey?: string;
  eodhdApiKey?: string;
}

export interface AllocationHolding {
  id: number;
  name: string;
  accountId: number;
  accountName: string;
  currency: string;
  cost: number;
  marketValue: number;
  marketValueCny: number;
  returnRate: number | null;
  pnlAmount: number;
  pnlAmountCny: number;
  disciplineSortOrder?: number | null;
  pctOfTotal: number;
}

export interface AllocationItem {
  id: number;
  name: string;
  targetPct: number;
  actualPct: number;
  actualValue: number;
  deviation: number;
  status: "normal" | "warning" | "danger";
  adjustAmount: number;
  totalCost: number;
  totalPnl: number;
  holdings: AllocationHolding[];
}

export interface AllocationData {
  totalAssetCny: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  allocation: AllocationItem[];
  rates: {
    rates: Record<string, number>;
    updatedAt: string;
    source: string;
  };
  settings: Settings;
}

export interface NetvalueRecord {
  id: number;
  date: string;
  totalAssetCny: number;
  dataJson: {
    allocation: { name: string; actualValue: number; actualPct: number }[];
    accounts: { name: string; currency: string; totalCny: number; cashCny: number }[];
    rates: Record<string, number>;
  };
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  HKD: "HK$",
};

/** 根据 colorMode 返回盈亏颜色 class。cn=正红负绿（A股），us=正绿负红（美股） */
export function pnlColorClass(value: number, colorMode: "cn" | "us"): string {
  if (value === 0) return "text-muted-foreground";
  if (colorMode === "cn") {
    return value > 0 ? "text-red-600" : "text-green-600";
  }
  return value > 0 ? "text-green-600" : "text-red-600";
}
