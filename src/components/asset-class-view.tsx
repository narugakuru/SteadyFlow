"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Holding, Account, CURRENCY_SYMBOLS } from "@/lib/types";
import { normalizeAssetClassName } from "@/lib/asset-class";
import { formatAmount, formatPercent } from "@/lib/format";

interface AssetClassViewProps {
  allocation: {
    name: string;
    actualValue: number;
    actualPct: number;
    targetPct: number;
    deviation: number;
  }[];
  holdings: Holding[];
  accounts: Account[];
  rates: Record<string, number>;
  totalAssetCny: number;
}

export function AssetClassView({
  allocation,
  holdings,
  accounts,
  rates,
  totalAssetCny,
}: AssetClassViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const toCny = (val: number, currency: string) => {
    if (currency === "CNY") return val;
    const pair = `${currency}/CNY`;
    return val * (rates[pair] ?? 1);
  };

  return (
    <div className="space-y-2">
      {allocation.map((cls) => {
        const isExpanded = expanded === cls.name;
        const isCash = cls.name === "现金";

        return (
          <div key={cls.name} className="border rounded-lg">
            <div
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : cls.name)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                <span className="font-medium">{cls.name}</span>
              </div>
              <div className="text-right text-sm">
                <span className="font-semibold">¥{formatAmount(cls.actualValue)}</span>
                <span className="text-muted-foreground ml-2">{formatPercent(cls.actualPct)}%</span>
                <span className="text-muted-foreground ml-1">
                  (目标 {formatPercent(cls.targetPct)}%)
                </span>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2 space-y-1">
                {isCash
                  ? accounts.map((a) => {
                      const cashCny = toCny(a.cashBalance, a.currency);
                      if (a.cashBalance === 0) return null;
                      const sym = CURRENCY_SYMBOLS[a.currency];
                      return (
                        <div key={a.id} className="flex items-center justify-between text-sm py-1">
                          <span>{a.name}</span>
                          <span>
                            {sym}
                            {formatAmount(a.cashBalance)}
                            {a.currency !== "CNY" && ` ≈ ¥${formatAmount(cashCny)}`}
                          </span>
                        </div>
                      );
                    })
                  : holdings
                      .filter((h) => normalizeAssetClassName(h.assetClass) === cls.name)
                      .map((h) => {
                        const account = accountMap.get(h.accountId);
                        if (!account) return null;
                        const valueCny = toCny(h.marketValue, account.currency);
                        const pct = totalAssetCny > 0 ? (valueCny / totalAssetCny) * 100 : 0;
                        const sym = CURRENCY_SYMBOLS[account.currency];
                        return (
                          <div
                            key={h.id}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span>{h.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {account.name}
                              </Badge>
                            </div>
                            <span>
                              {sym}
                              {formatAmount(h.marketValue)}
                              {account.currency !== "CNY" && ` ≈ ¥${formatAmount(valueCny)}`}
                              <span className="text-muted-foreground ml-1">
                                ({formatPercent(pct)}%)
                              </span>
                            </span>
                          </div>
                        );
                      })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
