"use client";

import { useState, useEffect } from "react";
import { AllocationItem, AllocationHolding, Holding, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { HoldingEditDialog } from "@/components/holding-edit-dialog";

interface DisciplineTableProps {
  allocation: AllocationItem[];
  colorMode: "cn" | "us";
  onDataChange: () => void;
}

export function DisciplineTable({ allocation, colorMode, onDataChange }: DisciplineTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editHoldingFull, setEditHoldingFull] = useState<Holding | null>(null);
  const [editHoldingCurrency, setEditHoldingCurrency] = useState<string>("CNY");

  const handleEditHolding = async (h: AllocationHolding) => {
    // Fetch full holding data to get valuationMode/shares/price
    const res = await fetch("/api/holdings");
    const all: Holding[] = await res.json();
    const full = all.find((item) => item.id === h.id);
    if (full) {
      setEditHoldingCurrency(h.currency);
      setEditHoldingFull(full);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
                        {/* 填充条 */}
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${Math.min(item.actualPct, 100)}%`,
                            backgroundColor: item.status === "danger" ? "#ef4444" : item.status === "warning" ? "#eab308" : "#22c55e",
                            opacity: 0.6,
                          }}
                        />
                        {/* 目标标记线 */}
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
                    <td colSpan={6} className="bg-muted/20 px-6 py-2">
                      {item.holdings.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-2">暂无持仓</p>
                      ) : (
                        <div className="space-y-1">
                          {item.holdings.map((h) => {
                            const sym = CURRENCY_SYMBOLS[h.currency] || "¥";
                            const isCash = h.id < 0;
                            return (
                              <div
                                key={h.id}
                                className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-accent/30"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{h.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {h.accountName}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span>
                                    {h.currency !== "CNY"
                                      ? `${sym}${h.marketValue.toLocaleString()} ≈ `
                                      : ""}
                                    ¥{h.marketValueCny.toLocaleString()}
                                  </span>
                                  {!isCash && h.returnRate !== null && (
                                    <span className={pnlColorClass(h.returnRate, colorMode)}>
                                      {h.returnRate > 0 ? "+" : ""}
                                      {h.returnRate.toFixed(2)}%
                                    </span>
                                  )}
                                  <span className="text-muted-foreground">
                                    {h.pctOfTotal}%
                                  </span>
                                  {!isCash && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditHolding(h);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
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

      {editHoldingFull && (
        <HoldingEditDialog
          holdingId={editHoldingFull.id}
          name={editHoldingFull.name}
          cost={editHoldingFull.cost}
          marketValue={editHoldingFull.marketValue}
          valuationMode={editHoldingFull.valuationMode}
          shares={editHoldingFull.shares}
          price={editHoldingFull.price}
          assetClass={editHoldingFull.assetClass}
          currency={editHoldingCurrency}
          open={!!editHoldingFull}
          onClose={() => setEditHoldingFull(null)}
          onSaved={() => {
            setEditHoldingFull(null);
            onDataChange();
          }}
        />
      )}
    </div>
  );
}
