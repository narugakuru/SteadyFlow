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
import { HoldingEditDialog } from "@/components/holding-edit-dialog";
import { TransactionForm } from "@/components/transaction-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  getNextDisciplineDetailSortState,
  readDisciplineDetailSortState,
  writeDisciplineDetailSortState,
  type DisciplineDetailSortKey,
  type DisciplineDetailSortState,
} from "@/lib/services/discipline-table-sort-state";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/utils/format";
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
  { key: "amount", label: "市值" },
  { key: "pnl", label: "持仓盈亏" },
];

type SelectedDisciplineHolding = {
  allocationHolding: AllocationHolding;
  holding: Holding;
};

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
        className="group flex w-full cursor-pointer items-center justify-end gap-1 px-3 py-2 transition-colors hover:bg-slate-50"
        onClick={() => onToggle(sortKey)}
      >
        <span
          className={cn(
            "text-xs font-medium",
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

function DetailMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-semibold tabular-nums", valueClassName)}>{value}</div>
    </div>
  );
}

function DisciplineHoldingDrawer({
  selected,
  currency,
  displayCurrency,
  totalAssetCny,
  rates,
  colorMode,
  onOpenChange,
  onBuy,
  onSell,
  onEdit,
}: {
  selected: SelectedDisciplineHolding | null;
  currency: string;
  displayCurrency: DisplayCurrencyMode;
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  onOpenChange: (open: boolean) => void;
  onBuy: () => void;
  onSell: () => void;
  onEdit: () => void;
}) {
  const holding = selected?.holding;
  const allocationHolding = selected?.allocationHolding;
  const displayAmountCurrency = displayCurrency === "default" ? currency : displayCurrency;
  const displaySymbol = getCurrencySymbol(displayAmountCurrency);
  const sourceSymbol = getCurrencySymbol(currency);

  const displayMarketValue =
    allocationHolding && displayCurrency !== "default"
      ? convertCurrency(allocationHolding.marketValue, currency, displayCurrency, rates)
      : (allocationHolding?.marketValue ?? 0);
  const displayPnl =
    allocationHolding && displayCurrency !== "default"
      ? convertCurrency(allocationHolding.pnlAmount, currency, displayCurrency, rates)
      : (allocationHolding?.pnlAmount ?? 0);
  const weight =
    allocationHolding && totalAssetCny > 0
      ? (allocationHolding.marketValueCny / totalAssetCny) * 100
      : 0;
  const totalCost =
    holding?.valuationMode === "shares" ? holding.cost * holding.shares : (holding?.cost ?? 0);
  const pnlClassName = pnlColorClass(displayPnl, colorMode);

  return (
    <Sheet open={!!selected} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(92vw,32rem)] gap-0 overflow-y-auto sm:max-w-none md:w-[clamp(24rem,32vw,34rem)]"
      >
        {holding && allocationHolding ? (
          <>
            <SheetHeader className="border-b px-5 py-5">
              <SheetTitle className="pr-8 text-xl">{holding.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {holding.ticker ? <span>{holding.ticker}</span> : null}
                <Badge variant="outline">{allocationHolding.accountName}</Badge>
              </div>
            </SheetHeader>
            <div className="space-y-5 px-5 py-5">
              <div>
                <div className="text-xs text-muted-foreground">市值</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {displaySymbol}
                  {formatAmount(displayMarketValue)}
                </div>
                {allocationHolding.returnRate === null ? (
                  <div className="mt-1 text-sm text-muted-foreground">--</div>
                ) : (
                  <div className={cn("mt-1 text-sm tabular-nums", pnlClassName)}>
                    {displayPnl > 0 ? "+" : ""}
                    {displaySymbol}
                    {formatAmount(displayPnl)}
                    <span className="ml-1">
                      ({allocationHolding.returnRate > 0 ? "+" : ""}
                      {formatPercent(allocationHolding.returnRate)}%)
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailMetric
                  label="份额"
                  value={holding.valuationMode === "shares" ? formatShares(holding.shares) : "--"}
                />
                <DetailMetric label="占总资产比" value={`${formatPercent(weight)}%`} />
                <DetailMetric
                  label="现价"
                  value={
                    holding.valuationMode === "shares"
                      ? `${sourceSymbol}${formatPrice(holding.price)}`
                      : "--"
                  }
                />
                <DetailMetric
                  label={holding.valuationMode === "shares" ? "成本价" : "成本"}
                  value={`${sourceSymbol}${
                    holding.valuationMode === "shares"
                      ? formatPrice(holding.cost)
                      : formatAmount(holding.cost)
                  }`}
                />
                <DetailMetric label="总成本" value={`${sourceSymbol}${formatAmount(totalCost)}`} />
                <DetailMetric
                  label="估值模式"
                  value={holding.valuationMode === "shares" ? "份额" : "金额"}
                />
              </div>

              {holding.memo?.trim() ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="text-xs text-muted-foreground">备注</div>
                  <div className="mt-1 whitespace-pre-wrap">{holding.memo}</div>
                </div>
              ) : null}
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2 border-t px-5 py-4">
              <Button type="button" onClick={onBuy}>
                买入
              </Button>
              <Button type="button" variant="outline" onClick={onSell}>
                卖出
              </Button>
              <Button type="button" variant="outline" onClick={onEdit}>
                编辑
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
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
  const [selectedHolding, setSelectedHolding] = useState<SelectedDisciplineHolding | null>(null);
  const [editHoldingOpen, setEditHoldingOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<"buy" | "sell">("buy");
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

  const openTx = (type: "buy" | "sell") => {
    if (!selectedHolding) return;
    setTxType(type);
    setTxOpen(true);
  };

  const getFullHolding = (ah: AllocationHolding): Holding | null => {
    return allHoldings.find((h) => h.id === ah.id) || null;
  };

  const getDisplayAmount = (value: number, currency: string) =>
    displayCurrency === "default"
      ? value
      : convertCurrency(value, currency, displayCurrency, rates);

  const getDisplayCurrency = (currency: string) =>
    displayCurrency === "default" ? currency : displayCurrency;

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

  const getHoldingDisplayValues = (ah: AllocationHolding) => {
    const displayAmountCurrency = getDisplayCurrency(ah.currency);
    const symbol = getCurrencySymbol(displayAmountCurrency);
    const sourceSymbol = getCurrencySymbol(ah.currency);
    const marketValue = getDisplayAmount(ah.marketValue, ah.currency);
    const pnlAmount = getDisplayAmount(ah.pnlAmount, ah.currency);
    const weight = totalAssetCny > 0 ? (ah.marketValueCny / totalAssetCny) * 100 : 0;

    return {
      symbol,
      sourceSymbol,
      marketValue,
      pnlAmount,
      weight,
    };
  };

  const renderPnl = (ah: AllocationHolding, compact = false) => {
    const { symbol, pnlAmount } = getHoldingDisplayValues(ah);

    if (ah.returnRate === null) {
      return <span className="text-muted-foreground">--</span>;
    }

    return (
      <span className={pnlColorClass(pnlAmount, colorMode)}>
        {pnlAmount > 0 ? "+" : ""}
        {symbol}
        {formatAmount(pnlAmount)}
        <span className={compact ? "ml-1" : "ml-1 text-xs"}>
          ({ah.returnRate > 0 ? "+" : ""}
          {formatPercent(ah.returnRate)}%)
        </span>
      </span>
    );
  };

  const renderDesktopHoldingTable = (item: AllocationItem) => {
    if (item.holdings.length === 0) {
      return <p className="text-muted-foreground text-sm py-2">暂无持仓</p>;
    }

    return (
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[860px] table-fixed text-sm">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">标的</th>
              <th className="px-3 py-2 text-right font-medium">份额</th>
              <th className="px-3 py-2 text-right font-medium">现价</th>
              <th className="px-3 py-2 text-right font-medium">成本价</th>
              <DesktopSortHeader
                label="市值"
                sortKey="amount"
                activeSort={detailSort}
                onToggle={handleDetailSortToggle}
              />
              <DesktopSortHeader
                label="盈亏"
                sortKey="pnl"
                activeSort={detailSort}
                onToggle={handleDetailSortToggle}
              />
            </tr>
          </thead>
          <tbody className="divide-y">
            {item.holdings.map((ah) => {
              const { symbol, sourceSymbol, marketValue } = getHoldingDisplayValues(ah);

              if (ah.id < 0) {
                return (
                  <tr key={ah.id} className="whitespace-nowrap">
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{ah.name}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {ah.accountName}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">--</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">--</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">--</td>
                    <td className="px-3 py-3 text-right text-base font-semibold tabular-nums">
                      {symbol}
                      {formatAmount(marketValue)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">--</td>
                  </tr>
                );
              }

              const full = getFullHolding(ah);
              if (!full || !dataLoaded) {
                return (
                  <tr key={ah.id}>
                    <td colSpan={6} className="px-3 py-3 text-sm text-muted-foreground">
                      {ah.name} - 加载中...
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={ah.id}
                  className="cursor-pointer whitespace-nowrap transition-colors hover:bg-accent/40"
                  onClick={() => setSelectedHolding({ allocationHolding: ah, holding: full })}
                >
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-base font-semibold text-foreground">
                        {ah.name}
                      </span>
                      {full.ticker ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {full.ticker}
                        </span>
                      ) : null}
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {ah.accountName}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {full.valuationMode === "shares" ? formatShares(full.shares) : "--"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {full.valuationMode === "shares"
                      ? `${sourceSymbol}${formatPrice(full.price)}`
                      : "--"}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {sourceSymbol}
                    {full.valuationMode === "shares"
                      ? formatPrice(full.cost)
                      : formatAmount(full.cost)}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-semibold tabular-nums">
                    {symbol}
                    {formatAmount(marketValue)}
                  </td>
                  <td className="px-3 py-3 text-right text-base font-semibold tabular-nums">
                    {renderPnl(ah)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMobileHoldingCards = (item: AllocationItem) => {
    if (item.holdings.length === 0) {
      return <p className="text-muted-foreground text-sm py-2">暂无持仓</p>;
    }

    return (
      <div className="space-y-2">
        {item.holdings.map((ah) => {
          const { symbol, sourceSymbol, marketValue, weight } = getHoldingDisplayValues(ah);

          if (ah.id < 0) {
            return (
              <div key={ah.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{ah.name}</div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {ah.accountName}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {symbol}
                      {formatAmount(marketValue)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatPercent(weight)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const full = getFullHolding(ah);
          if (!full || !dataLoaded) {
            return (
              <div
                key={ah.id}
                className="rounded-lg border bg-background px-3 py-3 text-sm text-muted-foreground"
              >
                {ah.name} - 加载中...
              </div>
            );
          }

          return (
            <button
              key={ah.id}
              type="button"
              className="block w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent/40"
              onClick={() => setSelectedHolding({ allocationHolding: ah, holding: full })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{ah.name}</div>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    {full.ticker ? (
                      <span className="truncate text-xs text-muted-foreground">{full.ticker}</span>
                    ) : null}
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {ah.accountName}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-semibold leading-tight tabular-nums">
                    {symbol}
                    {formatAmount(marketValue)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatPercent(weight)}%</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">盈亏</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{renderPnl(ah, true)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">现价</div>
                  <div className="mt-0.5 tabular-nums">
                    {full.valuationMode === "shares"
                      ? `${sourceSymbol}${formatPrice(full.price)}`
                      : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">成本价</div>
                  <div className="mt-0.5 tabular-nums">
                    {sourceSymbol}
                    {full.valuationMode === "shares"
                      ? formatPrice(full.cost)
                      : formatAmount(full.cost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">份额</div>
                  <div className="mt-0.5 tabular-nums">
                    {full.valuationMode === "shares" ? formatShares(full.shares) : "--"}
                  </div>
                </div>
              </div>
            </button>
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
                    className="cursor-pointer border-t transition-colors first:border-t-0 hover:bg-accent/50"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <td colSpan={4} className="px-4 py-4">
                      <div className="grid grid-cols-[minmax(12rem,16rem)_minmax(22rem,1fr)_minmax(14rem,18rem)] items-center gap-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 text-muted-foreground">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span className="truncate text-lg font-semibold">{item.name}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="relative h-6 overflow-hidden rounded bg-muted border border-black/5">
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
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums text-foreground/75">
                              {formatPercent(item.actualPct)}% / {formatPercent(item.targetPct)}%
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-semibold tabular-nums">
                            {summarySymbol}
                            {formatAmount(displayActualValue)}
                          </div>
                          <div className="mt-1 text-sm tabular-nums">
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
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${item.id}-detail`}>
                      <td colSpan={4} className="bg-muted/20 px-4 py-2">
                        {renderDesktopHoldingTable(item)}
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
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2">
                  {renderMobileHoldingCards(item)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DisciplineHoldingDrawer
        selected={selectedHolding}
        currency={selectedHolding?.allocationHolding.currency ?? summaryCurrency}
        displayCurrency={displayCurrency}
        totalAssetCny={totalAssetCny}
        rates={rates}
        colorMode={colorMode}
        onOpenChange={(open) => {
          if (!open) setSelectedHolding(null);
        }}
        onBuy={() => openTx("buy")}
        onSell={() => openTx("sell")}
        onEdit={() => setEditHoldingOpen(true)}
      />
      {selectedHolding && editHoldingOpen && (
        <HoldingEditDialog
          holdingId={selectedHolding.holding.id}
          name={selectedHolding.holding.name}
          ticker={selectedHolding.holding.ticker}
          memo={selectedHolding.holding.memo}
          cost={selectedHolding.holding.cost}
          marketValue={selectedHolding.holding.marketValue}
          valuationMode={selectedHolding.holding.valuationMode}
          shares={selectedHolding.holding.shares}
          price={selectedHolding.holding.price}
          assetClass={selectedHolding.holding.assetClass}
          currency={selectedHolding.allocationHolding.currency}
          open={editHoldingOpen}
          onClose={() => setEditHoldingOpen(false)}
          onSaved={() => {
            setEditHoldingOpen(false);
            handleDataChange();
          }}
        />
      )}
      {selectedHolding && (
        <TransactionForm
          open={txOpen}
          onOpenChange={setTxOpen}
          onSaved={handleDataChange}
          accounts={accounts}
          holdings={allHoldings}
          defaultType={txType}
          defaultAccountId={selectedHolding.holding.accountId}
          defaultHoldingId={selectedHolding.holding.id}
        />
      )}
    </>
  );
}
