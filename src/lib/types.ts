export interface Account {
  id: number;
  name: string;
  currency: "CNY" | "USD" | "HKD";
  totalBalance: number;
  createdAt: string;
  updatedAt: string;
  holdingsValue: number;
  holdingsCount: number;
  cash: number;
}

export interface Holding {
  id: number;
  accountId: number;
  name: string;
  marketValue: number;
  assetClass: "股票基金" | "黄金" | "债券";
  createdAt: string;
  updatedAt: string;
}

export interface AssetClass {
  id: number;
  name: string;
  targetPct: number;
  warningThreshold: number;
  dangerThreshold: number;
}

export interface AllocationItem {
  id: number;
  name: string;
  targetPct: number;
  actualPct: number;
  actualValue: number;
  deviation: number;
  status: "normal" | "warning" | "danger";
  warningThreshold: number;
  dangerThreshold: number;
}

export interface AllocationData {
  totalAssetCny: number;
  allocation: AllocationItem[];
  rates: {
    rates: Record<string, number>;
    updatedAt: string;
    source: string;
  };
}

export interface Snapshot {
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
