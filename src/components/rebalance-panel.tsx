"use client";

import { AllocationItem, pnlColorClass } from "@/lib/types";

interface RebalancePanelProps {
  allocation: AllocationItem[];
  warningThreshold: number;
  colorMode: "cn" | "us";
}

export function RebalancePanel({ allocation, warningThreshold, colorMode }: RebalancePanelProps) {
  const items = allocation.filter(
    (item) => Math.abs(item.deviation) >= warningThreshold
  );

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
            const isBuy = item.adjustAmount > 0;
            const absAmount = Math.abs(item.adjustAmount);
            return (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 gap-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.deviation > 0 ? `超配 +${item.deviation}%` : `低配 ${item.deviation}%`}
                  </span>
                </div>
                <span className={`text-sm font-medium ${pnlColorClass(item.adjustAmount, colorMode)}`}>
                  {isBuy ? "建议买入" : "建议卖出"} ¥{absAmount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
