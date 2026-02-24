"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Holding, Account, CURRENCY_SYMBOLS } from "@/lib/types";

interface AssetClassViewProps {
  allocation: { name: string; actualValue: number; actualPct: number; targetPct: number; deviation: number }[];
  holdings: Holding[];
  accounts: Account[];
  rates: Record<string, number>;
  totalAssetCny: number;
}

export function AssetClassView({ allocation, holdings, accounts, rates, totalAssetCny }: AssetClassViewProps) {
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
                <span className="font-semibold">¥{cls.actualValue.toLocaleString()}</span>
                <span className="text-muted-foreground ml-2">{cls.actualPct}%</span>
                <span className="text-muted-foreground ml-1">(目标 {cls.targetPct}%)</span>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t px-3 pb-3 pt-2 space-y-1">
                {isCash ? (
                  accounts.map((a) => {
                    const accHoldings = holdings.filter((h) => h.accountId === a.id);
                    const holdingsTotal = accHoldings.reduce((s, h) => s + h.marketValue, 0);
                    const cash = Math.max(0, a.totalBalance - holdingsTotal);
                    const cashCny = toCny(cash, a.currency);
                    if (cash === 0) return null;
                    const sym = CURRENCY_SYMBOLS[a.currency];
                    return (
                      <div key={a.id} className="flex items-center justify-between text-sm py-1">
                        <span>{a.name}</span>
                        <span>
                          {sym}{cash.toLocaleString()}
                          {a.currency !== "CNY" && ` ≈ ¥${cashCny.toLocaleString()}`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  holdings
                    .filter((h) => h.assetClass === cls.name)
                    .map((h) => {
                      const account = accountMap.get(h.accountId);
                      if (!account) return null;
                      const valueCny = toCny(h.marketValue, account.currency);
                      const pct = totalAssetCny > 0 ? ((valueCny / totalAssetCny) * 100).toFixed(2) : "0";
                      const sym = CURRENCY_SYMBOLS[account.currency];
                      return (
                        <div key={h.id} className="flex items-center justify-between text-sm py-1">
                          <div className="flex items-center gap-2">
                            <span>{h.name}</span>
                            <Badge variant="outline" className="text-xs">{account.name}</Badge>
                          </div>
                          <span>
                            {sym}{h.marketValue.toLocaleString()}
                            {account.currency !== "CNY" && ` ≈ ¥${valueCny.toLocaleString()}`}
                            <span className="text-muted-foreground ml-1">({pct}%)</span>
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
