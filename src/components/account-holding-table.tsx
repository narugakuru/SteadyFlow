"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Holding, Account, pnlColorClass, type DisplayCurrencyMode } from "@/lib/utils/types";
import { Badge } from "@/components/ui/badge";
import { convertCurrency, getCurrencySymbol } from "@/lib/utils/display-currency";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/utils/format";
import { cn } from "@/lib/utils/utils";

type AccountHoldingSortKey = "name" | "shares" | "price" | "cost" | "marketValue" | "pnl";
type AccountHoldingSortState = {
  key: AccountHoldingSortKey;
  direction: "asc" | "desc";
} | null;

function AccountSortIcon({
  sortState,
  sortKey,
}: {
  sortState: AccountHoldingSortState;
  sortKey: AccountHoldingSortKey;
}) {
  const isActive = sortState?.key === sortKey;
  const className = cn("h-3 w-3", isActive ? "text-blue-600" : "text-slate-300");

  if (!isActive) return <ArrowUpDown className={className} />;

  return sortState.direction === "desc" ? (
    <ArrowDown className={className} />
  ) : (
    <ArrowUp className={className} />
  );
}

function AccountSortableHeader({
  label,
  sortKey,
  sortState,
  onToggle,
  align = "right",
}: {
  label: string;
  sortKey: AccountHoldingSortKey;
  sortState: AccountHoldingSortState;
  onToggle: (key: AccountHoldingSortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = sortState?.key === sortKey;

  return (
    <th className={cn("p-0", align === "left" ? "text-left" : "text-right")}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 px-3 py-2 transition-colors hover:bg-slate-50",
          align === "left" ? "justify-start" : "justify-end"
        )}
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
        <AccountSortIcon sortState={sortState} sortKey={sortKey} />
      </button>
    </th>
  );
}

interface AccountHoldingTableProps {
  account: Account;
  holdings: Holding[];
  rates: Record<string, number>;
  displayCurrency: DisplayCurrencyMode;
  colorMode: "cn" | "us";
}

export function AccountHoldingTable({
  account,
  holdings,
  rates,
  displayCurrency,
  colorMode,
}: AccountHoldingTableProps) {
  const [sortState, setSortState] = useState<AccountHoldingSortState>(null);
  const displayAmountCurrency = displayCurrency === "default" ? account.currency : displayCurrency;
  const displaySymbol = getCurrencySymbol(displayAmountCurrency);
  const sourceSymbol = getCurrencySymbol(account.currency);

  const convertDisplayAmount = (amount: number) =>
    displayCurrency === "default"
      ? amount
      : convertCurrency(amount, account.currency, displayCurrency, rates);

  const getHoldingMetrics = (holding: Holding) => {
    const totalCost =
      holding.valuationMode === "shares" ? holding.cost * holding.shares : holding.cost;
    const pnl = totalCost > 0 ? holding.marketValue - totalCost : 0;
    const returnRate = totalCost > 0 ? (pnl / totalCost) * 100 : null;
    const displayMarketValue = convertDisplayAmount(holding.marketValue);
    const displayPnl = convertDisplayAmount(pnl);

    return {
      totalCost,
      pnl,
      returnRate,
      displayMarketValue,
      displayPnl,
    };
  };

  const sortedHoldings = !sortState
    ? holdings
    : holdings
        .map((holding, index) => ({
          holding,
          index,
          metrics: getHoldingMetrics(holding),
        }))
        .sort((left, right) => {
          let result = 0;

          if (sortState.key === "name") {
            result = left.holding.name.localeCompare(right.holding.name, "zh-Hans-CN");
          } else {
            const leftValue =
              sortState.key === "shares"
                ? left.holding.valuationMode === "shares"
                  ? left.holding.shares
                  : Number.NEGATIVE_INFINITY
                : sortState.key === "price"
                  ? left.holding.valuationMode === "shares"
                    ? left.holding.price
                    : Number.NEGATIVE_INFINITY
                  : sortState.key === "cost"
                    ? left.holding.cost
                    : sortState.key === "marketValue"
                      ? left.metrics.displayMarketValue
                      : left.metrics.displayPnl;
            const rightValue =
              sortState.key === "shares"
                ? right.holding.valuationMode === "shares"
                  ? right.holding.shares
                  : Number.NEGATIVE_INFINITY
                : sortState.key === "price"
                  ? right.holding.valuationMode === "shares"
                    ? right.holding.price
                    : Number.NEGATIVE_INFINITY
                  : sortState.key === "cost"
                    ? right.holding.cost
                    : sortState.key === "marketValue"
                      ? right.metrics.displayMarketValue
                      : right.metrics.displayPnl;

            result = leftValue - rightValue;
          }

          if (result === 0) {
            return left.index - right.index;
          }

          return sortState.direction === "desc" ? -result : result;
        })
        .map((entry) => entry.holding);

  const toggleSort = (key: AccountHoldingSortKey) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "desc" };
      }

      if (prev.direction === "desc") {
        return { key, direction: "asc" };
      }

      return null;
    });
  };

  if (holdings.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground">暂无持仓</p>;
  }

  return (
    <div className="overflow-x-auto">
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
            <AccountSortableHeader
              label="标的"
              sortKey="name"
              sortState={sortState}
              onToggle={toggleSort}
              align="left"
            />
            <AccountSortableHeader
              label="份额"
              sortKey="shares"
              sortState={sortState}
              onToggle={toggleSort}
            />
            <AccountSortableHeader
              label="现价"
              sortKey="price"
              sortState={sortState}
              onToggle={toggleSort}
            />
            <AccountSortableHeader
              label="成本价"
              sortKey="cost"
              sortState={sortState}
              onToggle={toggleSort}
            />
            <AccountSortableHeader
              label="市值"
              sortKey="marketValue"
              sortState={sortState}
              onToggle={toggleSort}
            />
            <AccountSortableHeader
              label="盈亏"
              sortKey="pnl"
              sortState={sortState}
              onToggle={toggleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedHoldings.map((holding) => {
            const { returnRate, displayMarketValue, displayPnl } = getHoldingMetrics(holding);
            const pnlClassName =
              returnRate === null ? "text-muted-foreground" : pnlColorClass(displayPnl, colorMode);

            return (
              <tr
                key={holding.id}
                className="whitespace-nowrap transition-colors hover:bg-accent/30"
              >
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-base font-semibold">{holding.name}</span>
                    {holding.ticker ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {holding.ticker}
                      </span>
                    ) : null}
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {account.name}
                    </Badge>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {holding.valuationMode === "shares" ? formatShares(holding.shares) : "--"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {holding.valuationMode === "shares"
                    ? `${sourceSymbol}${formatPrice(holding.price)}`
                    : "--"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {sourceSymbol}
                  {holding.valuationMode === "shares"
                    ? formatPrice(holding.cost)
                    : formatAmount(holding.cost)}
                </td>
                <td className="px-3 py-3 text-right text-base font-semibold tabular-nums">
                  {displaySymbol}
                  {formatAmount(displayMarketValue)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right text-base font-semibold tabular-nums",
                    pnlClassName
                  )}
                >
                  {returnRate === null ? (
                    "--"
                  ) : (
                    <>
                      {displayPnl > 0 ? "+" : ""}
                      {displaySymbol}
                      {formatAmount(displayPnl)}
                      <span className="ml-1 text-xs font-medium">
                        ({returnRate > 0 ? "+" : ""}
                        {formatPercent(returnRate)}%)
                      </span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
