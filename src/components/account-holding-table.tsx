"use client";

import { Holding, Account, pnlColorClass, type DisplayCurrencyMode } from "@/lib/utils/types";
import { convertCurrency, getCurrencySymbol } from "@/lib/utils/display-currency";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/utils/format";
import { cn } from "@/lib/utils/utils";

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
  const displayAmountCurrency = displayCurrency === "default" ? account.currency : displayCurrency;
  const displaySymbol = getCurrencySymbol(displayAmountCurrency);
  const sourceSymbol = getCurrencySymbol(account.currency);

  const convertDisplayAmount = (amount: number) =>
    displayCurrency === "default"
      ? amount
      : convertCurrency(amount, account.currency, displayCurrency, rates);

  if (holdings.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground">暂无持仓</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">标的</th>
            <th className="px-4 py-3 text-right font-medium">份额</th>
            <th className="px-4 py-3 text-right font-medium">现价</th>
            <th className="px-4 py-3 text-right font-medium">成本价</th>
            <th className="px-4 py-3 text-right font-medium">市值</th>
            <th className="px-4 py-3 text-right font-medium">盈亏</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {holdings.map((holding) => {
            const totalCost =
              holding.valuationMode === "shares" ? holding.cost * holding.shares : holding.cost;
            const pnl = totalCost > 0 ? holding.marketValue - totalCost : 0;
            const returnRate = totalCost > 0 ? (pnl / totalCost) * 100 : null;
            const displayMarketValue = convertDisplayAmount(holding.marketValue);
            const displayPnl = convertDisplayAmount(pnl);
            const pnlClassName =
              returnRate === null ? "text-muted-foreground" : pnlColorClass(displayPnl, colorMode);

            return (
              <tr key={holding.id} className="transition-colors hover:bg-accent/30">
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{holding.name}</div>
                    {holding.ticker ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {holding.ticker}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {holding.valuationMode === "shares" ? formatShares(holding.shares) : "--"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {holding.valuationMode === "shares"
                    ? `${sourceSymbol}${formatPrice(holding.price)}`
                    : "--"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {sourceSymbol}
                  {holding.valuationMode === "shares"
                    ? formatPrice(holding.cost)
                    : formatAmount(holding.cost)}
                </td>
                <td className="px-4 py-3 text-right text-base font-semibold tabular-nums">
                  {displaySymbol}
                  {formatAmount(displayMarketValue)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-base font-semibold tabular-nums",
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
