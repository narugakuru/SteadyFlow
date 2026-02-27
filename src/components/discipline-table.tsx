"use client";

import { useState, useEffect, Fragment } from "react";
import { AllocationItem, AllocationHolding, Holding, Account, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { HoldingRow } from "@/components/holding-row";
import { formatAmount, formatPercent } from "@/lib/format";

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

  const getFullHolding = (ah: AllocationHolding): Holding | null => {
    return allHoldings.find((h) => h.id === ah.id) || null;
  };

  const getStatusStyle = (status: string) =>
    status === "danger"
      ? "bg-red-100 text-red-800"
      : status === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-800";

  const getStatusIcon = (status: string) =>
    status === "danger" ? "🔴" : status === "warning" ? "⚠️" : "✅";

  const getDeviationLabel = (deviation: number) =>
    deviation > 0
      ? `超配 +${formatPercent(deviation)}%`
      : deviation < 0
      ? `低配 ${formatPercent(deviation)}%`
      : "正常";

  // Shared expanded holdings content
  const renderHoldings = (item: AllocationItem) => {
    if (item.holdings.length === 0) {
      return <p className="text-muted-foreground text-sm py-2">暂无持仓</p>;
    }
    return (
      <div className="space-y-0.5">
        {item.holdings.map((ah) => {
          const isCash = ah.id < 0;
          if (isCash) {
            const sym = CURRENCY_SYMBOLS[ah.currency] || "¥";
            return (
              <div key={ah.id} className="flex items-center justify-between text-sm py-2 px-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{ah.name}</span>
                  <Badge variant="outline" className="text-xs">{ah.accountName}</Badge>
                </div>
                <span>
                  {ah.currency !== "CNY" ? `${sym}${formatAmount(ah.marketValue)} ≈ ` : ""}
                  ¥{formatAmount(ah.marketValueCny)}
                </span>
              </div>
            );
          }
          const full = getFullHolding(ah);
          if (!full || !dataLoaded) {
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
    );
  };

  return (
    <>
      {/* Desktop: table layout */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium w-8"></th>
              <th className="text-left p-3 font-medium">资产类别</th>
              <th className="text-right p-3 font-medium">实际 / 目标</th>
              <th className="text-right p-3 font-medium">金额 (¥)</th>
              <th className="text-right p-3 font-medium">持仓盈亏</th>
              <th className="text-center p-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((item) => {
              const isExpanded = expanded.has(item.id);
              return (
                <Fragment key={item.id}>
                  <tr
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
                        <span className="text-sm tabular-nums whitespace-nowrap">
                          {formatPercent(item.actualPct)}% / {formatPercent(item.targetPct)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">¥{formatAmount(item.actualValue)}</td>
                    <td className="p-3 text-right">
                      {item.name === "现金" ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className={pnlColorClass(item.totalPnl, colorMode)}>
                          {item.totalPnl > 0 ? "+" : ""}
                          {item.totalPnl !== 0 ? `¥${formatAmount(item.totalPnl)}` : "--"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className={getStatusStyle(item.status)}>
                        {getStatusIcon(item.status)} {getDeviationLabel(item.deviation)}
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${item.id}-detail`}>
                      <td colSpan={6} className="bg-muted/20 px-4 py-2">
                        {renderHoldings(item)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3">
        {allocation.map((item) => {
          const isExpanded = expanded.has(item.id);
          return (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleExpand(item.id)}
              >
                {/* Card header: name + expand icon */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-sm">{isExpanded ? "▼" : "▶"}</span>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1 h-3 bg-muted rounded overflow-hidden">
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
                  <span className="text-xs tabular-nums whitespace-nowrap">
                    {formatPercent(item.actualPct)}% / {formatPercent(item.targetPct)}%
                  </span>
                </div>
                {/* Value + PnL + Status */}
                <div className="flex items-center justify-between text-sm">
                  <span>¥{formatAmount(item.actualValue)}</span>
                  <div className="flex items-center gap-2">
                    {item.name === "现金" ? (
                      <span className="text-muted-foreground text-xs">--</span>
                    ) : (
                      <span className={`text-xs ${pnlColorClass(item.totalPnl, colorMode)}`}>
                        {item.totalPnl > 0 ? "+" : ""}
                        {item.totalPnl !== 0 ? `¥${formatAmount(item.totalPnl)}` : "--"}
                      </span>
                    )}
                    <Badge variant="secondary" className={`text-xs ${getStatusStyle(item.status)}`}>
                      {getStatusIcon(item.status)} {getDeviationLabel(item.deviation)}
                    </Badge>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2">
                  {renderHoldings(item)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
