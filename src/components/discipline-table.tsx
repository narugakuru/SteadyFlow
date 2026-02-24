"use client";

import { useState } from "react";
import { AllocationItem, AllocationHolding, CURRENCY_SYMBOLS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface DisciplineTableProps {
  allocation: AllocationItem[];
  onDataChange: () => void;
}

export function DisciplineTable({ allocation, onDataChange }: DisciplineTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editHolding, setEditHolding] = useState<AllocationHolding | null>(null);

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
            <th className="text-right p-3 font-medium">目标</th>
            <th className="text-right p-3 font-medium">实际</th>
            <th className="text-right p-3 font-medium">金额 (¥)</th>
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
                  <td className="p-3 text-right">{item.targetPct}%</td>
                  <td className="p-3 text-right">{item.actualPct}%</td>
                  <td className="p-3 text-right">¥{item.actualValue.toLocaleString()}</td>
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
                                    <span
                                      className={
                                        h.returnRate > 0
                                          ? "text-green-600"
                                          : h.returnRate < 0
                                          ? "text-red-600"
                                          : "text-muted-foreground"
                                      }
                                    >
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
                                        setEditHolding(h);
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

      {editHolding && (
        <InlineEditDialog
          holding={editHolding}
          onClose={() => setEditHolding(null)}
          onSaved={() => {
            setEditHolding(null);
            onDataChange();
          }}
        />
      )}
    </div>
  );
}

interface InlineEditDialogProps {
  holding: AllocationHolding;
  onClose: () => void;
  onSaved: () => void;
}

function InlineEditDialog({ holding, onClose, onSaved }: InlineEditDialogProps) {
  const [name, setName] = useState(holding.name);
  const [cost, setCost] = useState(holding.cost.toString());
  const [marketValue, setMarketValue] = useState(holding.marketValue.toString());
  const [assetClass, setAssetClass] = useState("股票基金");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/holdings/${holding.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cost: parseFloat(cost) || 0,
        marketValue: parseFloat(marketValue) || 0,
        assetClass,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑持仓</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>持仓名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>本金 ({CURRENCY_SYMBOLS[holding.currency]})</Label>
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div>
            <Label>市值 ({CURRENCY_SYMBOLS[holding.currency]})</Label>
            <Input
              type="number"
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
            />
          </div>
          <div>
            <Label>资产类别</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="股票基金">股票基金</SelectItem>
                <SelectItem value="黄金">黄金</SelectItem>
                <SelectItem value="债券">债券</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
