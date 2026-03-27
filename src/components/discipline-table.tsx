"use client";

import { useEffect, useState, Fragment } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  convertCurrency,
  convertFromCny,
  getCurrencySymbol,
  getSummaryCurrency,
} from "@/lib/utils/display-currency";
import {
  AllocationItem,
  AllocationHolding,
  Holding,
  Account,
  pnlColorClass,
  type DisplayCurrencyMode,
} from "@/lib/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoldingRow } from "@/components/holding-row";
import { HoldingSortDialog } from "@/components/holding-sort-dialog";
import {
  getNextDisciplineDetailSortState,
  readDisciplineDetailSortState,
  writeDisciplineDetailSortState,
  type DisciplineDetailSortKey,
  type DisciplineDetailSortState,
} from "@/lib/services/discipline-table-sort-state";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/utils";
import { useUserScopedQuery } from "@/lib/cache/hooks";

interface DisciplineTableProps {
  allocation: AllocationItem[];
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  displayCurrency?: DisplayCurrencyMode;
  onDataChange: () => void;
}

const DISCIPLINE_DETAIL_SORT_LABELS: Array<{ key: DisciplineDetailSortKey; label: string }> = [
  { key: "amount", label: "金额" },
  { key: "pnl", label: "持仓盈亏" },
];

function getDisciplineDetailSortMetric(
  holding: AllocationHolding,
  sortKey: DisciplineDetailSortKey
): number | null {
  // Sort against a single comparable currency baseline to avoid mixing raw CNY/USD/HKD values.
  if (sortKey === "amount") {
    return holding.marketValueCny;
  }

  return holding.returnRate === null ? null : holding.pnlAmountCny;
}

function sortAllocationHoldings(
  holdings: AllocationHolding[],
  activeSort: DisciplineDetailSortState
): AllocationHolding[] {
  if (!activeSort) {
    return holdings;
  }

  return holdings
    .map((holding, index) => ({
      holding,
      index,
      metric: getDisciplineDetailSortMetric(holding, activeSort.key),
    }))
    .sort((left, right) => {
      const leftMissing = left.metric === null;
      const rightMissing = right.metric === null;
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;

      if (left.metric !== right.metric) {
        return activeSort.direction === "desc"
          ? (right.metric ?? 0) - (left.metric ?? 0)
          : (left.metric ?? 0) - (right.metric ?? 0);
      }

      return left.index - right.index;
    })
    .map((entry) => entry.holding);
}

function SortIndicator({
  activeSort,
  sortKey,
  className,
}: {
  activeSort: DisciplineDetailSortState;
  sortKey: DisciplineDetailSortKey;
  className?: string;
}) {
  const isActive = activeSort?.key === sortKey;
  const iconClassName = cn("h-3 w-3", className);

  if (!isActive) {
    return <ArrowUpDown className={cn(iconClassName, "text-slate-300")} />;
  }

  return activeSort.direction === "desc" ? (
    <ArrowDown className={cn(iconClassName, "text-blue-600")} />
  ) : (
    <ArrowUp className={cn(iconClassName, "text-blue-600")} />
  );
}

function DesktopSortHeader({
  label,
  sortKey,
  activeSort,
  onToggle,
}: {
  label: string;
  sortKey: DisciplineDetailSortKey;
  activeSort: DisciplineDetailSortState;
  onToggle: (sortKey: DisciplineDetailSortKey) => void;
}) {
  const isActive = activeSort?.key === sortKey;

  return (
    <th className="p-0 text-right">
      <button
        type="button"
        className="group flex w-full cursor-pointer items-center justify-end gap-1 px-3 py-3 hover:bg-slate-50 transition-colors"
        onClick={() => onToggle(sortKey)}
      >
        <span
          className={cn(
            "text-sm font-medium",
            isActive ? "font-bold text-blue-600" : "text-slate-500"
          )}
        >
          {label}
        </span>
        <SortIndicator activeSort={activeSort} sortKey={sortKey} />
      </button>
    </th>
  );
}

export function DisciplineTable({
  allocation,
  totalAssetCny,
  rates,
  colorMode,
  displayCurrency = "default",
  onDataChange,
}: DisciplineTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [detailSort, setDetailSort] = useState<DisciplineDetailSortState>(null);
  const [sortPreferenceReady, setSortPreferenceReady] = useState(false);
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
  const sortableHoldingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: sortHoldingFor
      ? `/api/holdings?scope=discipline&assetClass=${encodeURIComponent(sortHoldingFor.assetClass)}`
      : "/api/holdings?scope=discipline",
    params: sortHoldingFor
      ? { scope: "discipline", assetClass: sortHoldingFor.assetClass }
      : { scope: "discipline" },
    enabled: !!sortHoldingFor,
  });
  const allHoldings = holdingsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const dataLoaded = !holdingsQuery.isLoading && !accountsQuery.isLoading;
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));
  const summaryCurrency = getSummaryCurrency(displayCurrency);
  const summarySymbol = getCurrencySymbol(summaryCurrency);
  const displayedAllocation = allocation.map((item) => ({
    ...item,
    holdings: sortAllocationHoldings(item.holdings, detailSort),
  }));

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setDetailSort(readDisciplineDetailSortState());
      setSortPreferenceReady(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!sortPreferenceReady) return;
    writeDisciplineDetailSortState(detailSort);
  }, [detailSort, sortPreferenceReady]);

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

  const handleDetailSortToggle = (sortKey: DisciplineDetailSortKey) => {
    setDetailSort((prev) => getNextDisciplineDetailSortState(prev, sortKey));
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

  const renderMobileSortButton = ({
    label,
    sortKey,
    align,
  }: {
    label: string;
    sortKey: DisciplineDetailSortKey;
    align: "left" | "right";
  }) => {
    const isActive = detailSort?.key === sortKey;

    return (
      <button
        type="button"
        className={cn(
          "inline-flex min-w-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
          align === "right" ? "justify-end text-right" : "justify-start text-left",
          isActive ? "text-blue-600" : "text-slate-400"
        )}
        onClick={() => handleDetailSortToggle(sortKey)}
      >
        <span className="truncate">{label}</span>
        <SortIndicator activeSort={detailSort} sortKey={sortKey} className="h-2.5 w-2.5" />
        {isActive ? <span className="h-1 w-1 rounded-full bg-blue-500" /> : null}
      </button>
    );
  };

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
              const cashCurrency = displayCurrency === "default" ? ah.currency : displayCurrency;
              const cashValue =
                displayCurrency === "default"
                  ? ah.marketValue
                  : convertCurrency(ah.marketValue, ah.currency, displayCurrency, rates);
              const cashSymbol = getCurrencySymbol(cashCurrency);
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
                    {cashSymbol}
                    {formatAmount(cashValue)}
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
                displayCurrency={displayCurrency}
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
              <DesktopSortHeader
                label={`金额 (${summarySymbol})`}
                sortKey="amount"
                activeSort={detailSort}
                onToggle={handleDetailSortToggle}
              />
              <DesktopSortHeader
                label="持仓盈亏"
                sortKey="pnl"
                activeSort={detailSort}
                onToggle={handleDetailSortToggle}
              />
              <th className="text-center p-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {displayedAllocation.map((item) => {
              const isExpanded = expanded.has(item.id);
              const displayActualValue = convertFromCny(item.actualValue, summaryCurrency, rates);
              const displayTotalPnl = convertFromCny(item.totalPnl, summaryCurrency, rates);
              const totalPnlPct =
                item.totalCost > 0 ? (item.totalPnl / item.totalCost) * 100 : null;
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
                    <td className="p-3 text-right">
                      {summarySymbol}
                      {formatAmount(displayActualValue)}
                    </td>
                    <td className="p-3 text-right">
                      {item.name === "现金" || totalPnlPct === null ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span className={pnlColorClass(displayTotalPnl, colorMode)}>
                          {displayTotalPnl > 0 ? "+" : ""}
                          {summarySymbol}
                          {formatAmount(displayTotalPnl)}
                          <span className="ml-1 text-xs">
                            ({totalPnlPct > 0 ? "+" : ""}
                            {formatPercent(totalPnlPct)}%)
                          </span>
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
        {displayedAllocation.length > 0 ? (
          <div className="sticky top-0 z-10 -mb-1 flex h-7 items-center justify-between rounded-md border border-slate-200/80 bg-white/90 px-3 backdrop-blur-md">
            {DISCIPLINE_DETAIL_SORT_LABELS.map((item, index) => (
              <div key={item.key} className={cn("min-w-0", index === 0 ? "flex-1" : "w-32")}>
                {renderMobileSortButton({
                  label: item.label,
                  sortKey: item.key,
                  align: index === 0 ? "left" : "right",
                })}
              </div>
            ))}
          </div>
        ) : null}
        {displayedAllocation.map((item) => {
          const isExpanded = expanded.has(item.id);
          const displayActualValue = convertFromCny(item.actualValue, summaryCurrency, rates);
          const displayTotalPnl = convertFromCny(item.totalPnl, summaryCurrency, rates);
          const totalPnlPct = item.totalCost > 0 ? (item.totalPnl / item.totalCost) * 100 : null;
          return (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="text-muted-foreground text-sm">{isExpanded ? "▼" : "▶"}</span>
                  </div>
                  <span className="text-xs tabular-nums whitespace-nowrap text-right">
                    {formatPercent(item.actualPct)}% / {formatPercent(item.targetPct)}%
                  </span>
                </div>
                <div className="relative mt-2 h-2.5 bg-muted rounded overflow-hidden">
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
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold leading-tight tabular-nums break-all">
                    {summarySymbol}
                    {formatAmount(displayActualValue)}
                  </p>
                  {item.name === "现金" || totalPnlPct === null ? (
                    <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                      --
                    </span>
                  ) : (
                    <span
                      className={`text-xs tabular-nums whitespace-nowrap ${pnlColorClass(displayTotalPnl, colorMode)}`}
                    >
                      {displayTotalPnl > 0 ? "+" : ""}
                      {summarySymbol}
                      {formatAmount(displayTotalPnl)}
                      <span className="ml-1">
                        ({totalPnlPct > 0 ? "+" : ""}
                        {formatPercent(totalPnlPct)}%)
                      </span>
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "max-w-[11rem] justify-start gap-1 text-[10px] py-0.5 font-normal overflow-hidden",
                      getStatusStyle(item.status)
                    )}
                  >
                    <span className="flex-shrink-0">{getStatusIcon(item.status)}</span>
                    <span className="truncate">{getDeviationLabel(item.deviation)}</span>
                  </Badge>
                  {item.name !== "现金" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground flex-shrink-0"
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
                    <div className="h-7 w-7 flex-shrink-0" />
                  )}
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
          holdings={(sortableHoldingsQuery.data ?? []).filter(
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
