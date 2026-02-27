"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Account, Holding, CURRENCY_SYMBOLS } from "@/lib/types";
import { getAssetClassColor } from "@/lib/asset-class-colors";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface HoldingEdit {
  marketValue: number;
  price?: number;
}

interface EditState {
  holdings: Record<number, HoldingEdit>;
}

export default function BatchUpdatePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [edits, setEdits] = useState<EditState>({ holdings: {} });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, holdRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/holdings"),
    ]);
    const [accData, holdData] = await Promise.all([
      accRes.json(),
      holdRes.json(),
    ]);
    setAccounts(accData);
    setHoldings(holdData);
    setEdits({ holdings: {} });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasChanges = Object.keys(edits.holdings).length > 0;

  const handleMarketValueChange = (h: Holding, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setEdits((prev) => {
      const next = { ...prev, holdings: { ...prev.holdings } };
      const isShares = h.valuationMode === "shares" && h.shares > 0;
      const newPrice = isShares ? num / h.shares : undefined;
      // Check if value is back to original
      if (num === h.marketValue) {
        delete next.holdings[h.id];
      } else {
        next.holdings[h.id] = { marketValue: num, price: newPrice };
      }
      return next;
    });
  };

  const handlePriceChange = (h: Holding, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setEdits((prev) => {
      const next = { ...prev, holdings: { ...prev.holdings } };
      const newMarketValue = h.shares * num;
      if (num === h.price && newMarketValue === h.marketValue) {
        delete next.holdings[h.id];
      } else {
        next.holdings[h.id] = { marketValue: newMarketValue, price: num };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/batch-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        holdings: Object.entries(edits.holdings).map(([id, edit]) => ({
          id: Number(id),
          marketValue: edit.marketValue,
          ...(edit.price !== undefined ? { price: edit.price } : {}),
        })),
      }),
    });
    setSaving(false);
    await fetchData();
  };

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-screen" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">✏️ 批量更新</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">← 返回 Dashboard</Button>
          </Link>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? "保存中..." : "保存所有变更"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <p className="text-sm text-muted-foreground">
          已修改 {Object.keys(edits.holdings).length} 个持仓
        </p>
      )}

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无账户</p>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => {
            const sym = CURRENCY_SYMBOLS[acc.currency] || "¥";
            const accHoldings = holdings.filter((h) => h.accountId === acc.id);

            return (
              <div key={acc.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{acc.name}</span>
                    <Badge variant="outline">{acc.currency}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>总价值 {sym}{acc.accountValue.toLocaleString()}</span>
                    <span>现金 {sym}{acc.cashBalance.toLocaleString()}</span>
                  </div>
                </div>

                {accHoldings.length > 0 && (
                  <div className="space-y-1.5 pl-2">
                    {accHoldings.map((h) => {
                      const edit = edits.holdings[h.id];
                      const isModified = !!edit;
                      const isShares = h.valuationMode === "shares";
                      const modifiedStyle = "border-blue-400 bg-blue-50";

                      return (
                        <div key={h.id} className="flex flex-col md:flex-row md:items-center justify-between text-sm gap-2">
                          <div className="flex items-center gap-2 min-w-0 shrink-0">
                            <span className="truncate">{h.name}</span>
                            <Badge variant="secondary" className={`text-xs ${getAssetClassColor(h.assetClass)}`}>
                              {h.assetClass}
                            </Badge>
                          </div>
                          {isShares ? (
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-xs">市值</span>
                                <Input
                                  type="number"
                                  className={`w-28 text-right ${isModified ? modifiedStyle : ""}`}
                                  value={edit ? edit.marketValue : h.marketValue}
                                  onChange={(e) => handleMarketValueChange(h, e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-xs">股数</span>
                                <span className="w-20 text-right inline-block">{h.shares.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-xs">股价</span>
                                <Input
                                  type="number"
                                  className={`w-24 text-right ${isModified ? modifiedStyle : ""}`}
                                  value={edit?.price !== undefined ? edit.price : h.price}
                                  onChange={(e) => handlePriceChange(h, e.target.value)}
                                  disabled={h.shares === 0}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">市值 ({sym})</span>
                              <Input
                                type="number"
                                className={`w-32 text-right ${isModified ? modifiedStyle : ""}`}
                                defaultValue={h.marketValue}
                                onChange={(e) => handleMarketValueChange(h, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {accHoldings.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-2">暂无持仓</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
