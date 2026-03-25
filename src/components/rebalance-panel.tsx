"use client";

import {
  convertFromCny,
  getCurrencySymbol,
  getSummaryCurrency,
} from "@/lib/utils/display-currency";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { AllocationItem, pnlColorClass, type DisplayCurrencyMode } from "@/lib/utils/types";

interface RebalancePanelProps {
  allocation: AllocationItem[];
  warningThreshold: number;
  colorMode: "cn" | "us";
  rates: Record<string, number>;
  displayCurrency?: DisplayCurrencyMode;
}

export function RebalancePanel({
  allocation,
  warningThreshold,
  colorMode,
  rates,
  displayCurrency = "default",
}: RebalancePanelProps) {
  const items = allocation.filter((item) => Math.abs(item.deviation) >= warningThreshold);
  const summaryCurrency = getSummaryCurrency(displayCurrency);
  const summarySymbol = getCurrencySymbol(summaryCurrency);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">再平衡建议</h2>
      {items.length === 0 ? (
        <div className="border rounded-lg p-4 text-center text-muted-foreground">
          当前配置均衡，无需调整
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {items.map((item) => {
            const displayAdjustAmount = convertFromCny(item.adjustAmount, summaryCurrency, rates);
            const isBuy = displayAdjustAmount > 0;
            const absAmount = Math.abs(displayAdjustAmount);
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-1 p-3 md:flex-row md:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.deviation > 0
                      ? `超配 +${formatPercent(item.deviation)}%`
                      : `低配 ${formatPercent(item.deviation)}%`}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${pnlColorClass(displayAdjustAmount, colorMode)}`}
                >
                  {isBuy ? "建议买入" : "建议卖出"} {summarySymbol}
                  {formatAmount(absAmount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
