"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssetClass, CURRENCY_SYMBOLS } from "@/lib/types";
import { useTriFieldLinked } from "@/lib/hooks";

interface HoldingEditDialogProps {
  holdingId: number;
  name: string;
  ticker?: string | null;
  cost: number;
  marketValue: number;
  valuationMode: "amount" | "shares";
  shares: number;
  price: number;
  assetClass: string;
  currency: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function HoldingEditDialog({
  holdingId,
  name: initName,
  ticker: initTicker,
  cost: initCost,
  marketValue: initMarketValue,
  valuationMode,
  shares: initShares,
  price: initPrice,
  assetClass: initAssetClass,
  currency,
  open,
  onClose,
  onSaved,
}: HoldingEditDialogProps) {
  const [name, setName] = useState(initName);
  const [ticker, setTicker] = useState(initTicker || "");
  const [cost, setCost] = useState(initCost.toString());
  const [marketValue, setMarketValue] = useState(initMarketValue.toString());
  const [assetClass, setAssetClass] = useState(initAssetClass);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [saving, setSaving] = useState(false);

  const sym = CURRENCY_SYMBOLS[currency] || "¥";
  const isShares = valuationMode === "shares";

  const tri = useTriFieldLinked({
    price: initPrice,
    shares: initShares,
    marketValue: initMarketValue,
  });

  useEffect(() => {
    if (open) {
      fetch("/api/asset-classes")
        .then((r) => r.json())
        .then((data: AssetClass[]) => {
          setAssetClasses(data.filter((c) => c.name !== "现金"));
        });
    }
  }, [open]);

  const computedStyle = "text-muted-foreground italic";

  const handleSave = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      name,
      ticker: ticker || null,
      assetClass,
    };

    if (isShares) {
      payload.price = parseFloat(tri.price) || 0;
      payload.shares = parseFloat(tri.shares) || 0;
      payload.marketValue = parseFloat(tri.marketValue) || 0;
      payload.cost = parseFloat(cost) || 0;
    } else {
      payload.marketValue = parseFloat(marketValue) || 0;
    }

    await fetch(`/api/holdings/${holdingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑持仓</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>持仓名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>股票代码（选填）</Label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="aapl.us / 600519.SS"
              />
            </div>
          </div>

          {isShares ? (
            <>
              {/* 成本价修正 */}
              <div>
                <Label>成本价 ({sym})</Label>
                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  平均每股成本，通常由交易自动计算
                </p>
              </div>
              {/* 三字段联动：现价 / 份额 / 市值 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className={tri.computedField === "price" ? computedStyle : ""}>
                    现价 ({sym}) {tri.computedField === "price" && "·自动"}
                  </Label>
                  <Input
                    type="number"
                    value={tri.price}
                    onChange={(e) => tri.onPriceChange(e.target.value)}
                    className={tri.computedField === "price" ? "italic text-muted-foreground" : ""}
                  />
                </div>
                <div>
                  <Label className={tri.computedField === "shares" ? computedStyle : ""}>
                    份额 {tri.computedField === "shares" && "·自动"}
                  </Label>
                  <Input
                    type="number"
                    value={tri.shares}
                    onChange={(e) => tri.onSharesChange(e.target.value)}
                    className={tri.computedField === "shares" ? "italic text-muted-foreground" : ""}
                  />
                </div>
                <div>
                  <Label className={tri.computedField === "marketValue" ? computedStyle : ""}>
                    市值 ({sym}) {tri.computedField === "marketValue" && "·自动"}
                  </Label>
                  <Input
                    type="number"
                    value={tri.marketValue}
                    onChange={(e) => tri.onMarketValueChange(e.target.value)}
                    className={
                      tri.computedField === "marketValue" ? "italic text-muted-foreground" : ""
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                编辑任意两个字段，第三个自动计算（标记为&ldquo;·自动&rdquo;）
              </p>
            </>
          ) : (
            <div>
              <Label>市值 ({sym})</Label>
              <Input
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>资产类别</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetClasses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
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
