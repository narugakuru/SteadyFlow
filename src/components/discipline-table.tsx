"use client";

import { useState, Fragment } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  AllocationItem,
  AllocationHolding,
  Holding,
  Account,
  CURRENCY_SYMBOLS,
  pnlColorClass,
} from "@/lib/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoldingRow } from "@/components/holding-row";
import { HoldingSortDialog } from "@/components/holding-sort-dialog";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/utils"; // 确保你有这个工具函数，没有的话可以手动写类名
import { useUserScopedQuery } from "@/lib/cache/hooks";

interface DisciplineTableProps {
  allocation: AllocationItem[];
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  onDataChange: () => void;
}

export function DisciplineTable({
  allocation,
  totalAssetCny,
  rates,
  colorMode,
  onDataChange,
}: DisciplineTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sortHoldingFor, setSortHoldingFor] = useState<{
    assetClass: string;
    title: string;
  } | null>(null);
  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: "/api/holdings",
  });
  const accountsQuery = useUserScopedQuery<Account[]>({
    name: "accounts",
    path: "/api/accounts",
  });
  const allHoldings = holdingsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const dataLoaded = !holdingsQuery.isLoading && !accountsQuery.isLoading;
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDataChange = () => {
    void Promise.all([holdingsQuery.refetch(), accountsQuery.refetch()]);
    void onDataChange();
  };

  const getFullHolding = (ah: AllocationHolding): Holding | null => {
    return allHoldings.find((h) => h.id === ah.id) || null;
  };

  const getStatusStyle = (status: string) =>
    status === "danger"
      ? "bg-red-100 text-red-800 border-red-200"
      : status === "warning"
        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
        : "bg-green-100 text-green-800 border-green-200";

  const getStatusIcon = (status: string) =>
    status === "danger" ? "🔴" : status === "warning" ? "⚠️" : "✅";

  const getDeviationLabel = (deviation: number) =>
    deviation > 0
      ? `超配 +${formatPercent(deviation)}%`
      : deviation < 0
        ? `低配 ${formatPercent(deviation)}%`
        : "正常";

  const renderHoldings = (item: AllocationItem) => {
    if (item.holdings.length === 0) {
      return <p className="text-muted-foreground text-sm py-2">暂无持仓</p>;
    }

    return (
      <div className="space-y-2">
        <div className="space-y-0.5">
          {item.holdings.map((ah) => {
            const isCash = ah.id < 0;
            if (isCash) {
              const sym = CURRENCY_SYMBOLS[ah.currency] || "¥";
              return (
                <div
                  key={ah.id}
                  className="flex items-center justify-between text-sm py-2 px-2 text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>{ah.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {ah.accountName}
                    </Badge>
                  </div>
                  <span>
                    {ah.currency !== "CNY" ? `${sym}${formatAmount(ah.marketValue)} ≈ ` : ""}¥
                    {formatAmount(ah.marketValueCny)}
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
                    <td className="p-3 text-muted-foreground">{isExpanded ? "▼" : "▶"}</td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end">
                        <div className="relative w-24 h-4 bg-muted rounded overflow-hidden flex-shrink-0 mr-3 border border-black/5">
                          <div
                            className="absolute inset-y-0 left-0 rounded"
                            style={{
                              width: `${Math.min(item.actualPct, 100)}%`,
                              backgroundColor:
                                item.status === "danger"
                                  ? "#ef4444"
                                  : item.status === "warning"
                                    ? "#eab308"
                                    : "#22c55e",
                              opacity: 0.6,
                            }}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-foreground/70"
                            style={{ left: `${Math.min(item.targetPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums whitespace-nowrap min-w-[90px] text-right">
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
                    <td className="p-3">
                      {/* 状态列容器：右对齐，确保与表头对齐 */}
                      <div className="flex items-center justify-end gap-2 pr-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "w-32 justify-start py-1 px-3 font-normal overflow-hidden",
                            getStatusStyle(item.status)
                          )}
                        >
                          {/* 1. 图标层：固定宽度，确保后面的文字起点一致 */}
                          <span className="w-5 flex-shrink-0 flex items-center justify-center">
                            {getStatusIcon(item.status)}
                          </span>

                          {/* 2. 标签层：固定起点 */}
                          <span className="flex-1 ml-1 text-left whitespace-nowrap tabular-nums">
                            {getDeviationLabel(item.deviation)}
                          </span>
                        </Badge>

                        {/* 3. 排序按钮/占位符：确保宽度一致 */}
                        {item.name !== "现金" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground flex-shrink-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSortHoldingFor({
                                assetClass: item.name,
                                title: `排序持仓 - ${item.name}`,
                              });
                            }}
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="h-6 w-6 flex-shrink-0" />
                        )}
                      </div>
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
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-sm">{isExpanded ? "▼" : "▶"}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="relative flex-1 h-3 bg-muted rounded overflow-hidden mr-3">
                    <div
                      className="absolute inset-y-0 left-0 rounded"
                      style={{
                        width: `${Math.min(item.actualPct, 100)}%`,
                        backgroundColor:
                          item.status === "danger"
                            ? "#ef4444"
                            : item.status === "warning"
                              ? "#eab308"
                              : "#22c55e",
                        opacity: 0.6,
                      }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/70"
                      style={{ left: `${Math.min(item.targetPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums whitespace-nowrap min-w-[80px] text-right">
                    {formatPercent(item.actualPct)}% / {formatPercent(item.targetPct)}%
                  </span>
                </div>
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
                    {/* 移动端也同步固定宽度，但稍微窄一点点 */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-28 justify-center text-[10px] py-0.5 font-normal",
                        getStatusStyle(item.status)
                      )}
                    >
                      {getDeviationLabel(item.deviation)}
                    </Badge>
                    {item.name !== "现金" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSortHoldingFor({
                            assetClass: item.name,
                            title: `排序持仓 - ${item.name}`,
                          });
                        }}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <div className="h-6 w-6" />
                    )}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2">{renderHoldings(item)}</div>
              )}
            </div>
          );
        })}
      </div>

      {sortHoldingFor && (
        <HoldingSortDialog
          open={!!sortHoldingFor}
          onOpenChange={(open) => !open && setSortHoldingFor(null)}
          title={sortHoldingFor.title}
          scope="discipline"
          assetClass={sortHoldingFor.assetClass}
          accountNameById={accountNameById}
          holdings={allHoldings.filter(
            (holding) => normalizeAssetClassName(holding.assetClass) === sortHoldingFor.assetClass
          )}
          onSaved={() => {
            setSortHoldingFor(null);
            handleDataChange();
          }}
        />
      )}
    </>
  );
}
