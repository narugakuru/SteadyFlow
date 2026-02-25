"use client";

import { useState, useEffect } from "react";
import { AllocationItem, AllocationHolding, Holding, Account, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { HoldingRow } from "@/components/holding-row";

interface DisciplineTableProps {
  allocation: AllocationItem[];
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  onDataChange: () => void;
}

export function DisciplineTable({ allocation, totalAssetCny, rates, colorMode, onDataChange }: DisciplineTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [allHoldings, setAllHoldings] = useState<Holding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch full holdings + accounts data for HoldingRow (needed for edit/trade)
  const fetchData = async () => {
    const [hRes, aRes] = await Promise.all([
      fetch("/api/holdings"),
      fetch("/api/accounts"),
    ]);
    const [hData, aData] = await Promise.all([hRes.json(), aRes.json()]);
    setAllHoldings(hData);
    setAccounts(aData);
    setDataLoaded(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDataChange = () => {
    fetchData();
    onDataChange();
  };

  // Map AllocationHolding to full Holding for HoldingRow
  const getFullHolding = (ah: AllocationHolding): Holding | null => {
    return allHoldings.find((h) => h.id === ah.id) || null;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium w-8"></th>
            <th className="text-left p-3 font-medium">资产类别</th>
            <th className="text-right p-3 font-medium">实际 / 目标</th>
            <th className="text-right p-3 font-medium">金额 (¥)</th>
            <th className="text-right p-3 font-medium">盈亏</th>
            <th className="text-center p-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {allocation.map((item) => {
            const isExpanded = expanded.has(item.id);
            const deviationLabel =
              item.deviation > 0
                ? `超配 +${item.deviation}%`
                : item.deviation < 0
                ? `低配 ${item.deviation}%`
                : "正常";

            const statusStyle =
              item.status === "danger"
                ? "bg-red-100 text-red-800"
                : item.status === "warning"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800";

            const statusIcon =
              item.status === "danger" ? "🔴" : item.status === "warning" ? "⚠️" : "✅";

            return (
              <>
                <tr
                  key={item.id}
                  className="border-t cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  <td className="p-3 text-muted-foreground">
                    {isExpanded ? "▼" : "▶"}
                  </td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="relative w-20 h-4 bg-muted rounded overflow-hidden flex-shrink-0">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${Math.min(item.actualPct, 100)}%`,
                            backgroundColor: item.status === "danger" ? "#ef4444" : item.status === "warning" ? "#eab308" : "#22c55e",
                            opacity: 0.6,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 w-0.5 bg-foreground/70"
                          style={{ left: `${Math.min(item.targetPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums whitespace-nowrap">{item.actualPct}% / {item.targetPct}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">¥{item.actualValue.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {item.name === "现金" ? (
                      <span className="text-muted-foreground">--</span>
                    ) : (
                      <span className={pnlColorClass(item.totalPnl, colorMode)}>
                        {item.totalPnl > 0 ? "+" : ""}{item.totalPnl !== 0 ? `¥${item.totalPnl.toLocaleString()}` : "--"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="secondary" className={statusStyle}>
                      {statusIcon} {deviationLabel}
                    </Badge>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${item.id}-detail`}>
                    <td colSpan={6} className="bg-muted/20 px-4 py-2">
                      {item.holdings.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-2">暂无持仓</p>
                      ) : (
                        <div className="space-y-0.5">
                          {item.holdings.map((ah) => {
                            const isCash = ah.id < 0;
                            if (isCash) {
                              // Cash row: simple display, no actions
                              const sym = CURRENCY_SYMBOLS[ah.currency] || "¥";
                              return (
                                <div key={ah.id} className="flex items-center justify-between text-sm py-2 px-2 text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <span>{ah.name}</span>
                                    <Badge variant="outline" className="text-xs">{ah.accountName}</Badge>
                                  </div>
                                  <span>
                                    {ah.currency !== "CNY" ? `${sym}${ah.marketValue.toLocaleString()} ≈ ` : ""}
                                    ¥{ah.marketValueCny.toLocaleString()}
                                  </span>
                                </div>
                              );
                            }
                            const full = getFullHolding(ah);
                            if (!full || !dataLoaded) {
                              // Fallback while loading
                              return (
                                <div key={ah.id} className="text-sm py-2 px-2 text-muted-foreground">
                                  {ah.name} — 加载中...
                                </div>
                              );
                            }
                            return (
                              <HoldingRow
                                key={ah.id}
                                holding={full}
                                currency={ah.currency}
                                totalAssetCny={totalAssetCny}
                                rates={rates}
                                colorMode={colorMode}
                                showAccountName
                                accountName={ah.accountName}
                                actions="compact"
                                accountId={full.accountId}
                                accounts={accounts}
                                allHoldings={allHoldings}
                                onDataChange={handleDataChange}
                              />
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
