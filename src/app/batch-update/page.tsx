"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Account, Holding, CURRENCY_SYMBOLS } from "@/lib/types";
import { getAssetClassColor } from "@/lib/asset-class-colors";
import { normalizeAssetClassName } from "@/lib/asset-class";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAmount, formatShares, roundForStorage } from "@/lib/format";

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
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [priceMsg, setPriceMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accRes, holdRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/holdings")]);
    const [accData, holdData] = await Promise.all([accRes.json(), holdRes.json()]);
    setAccounts(accData);
    setHoldings(holdData);
    setEdits({ holdings: {} });
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const hasChanges = Object.keys(edits.holdings).length > 0;

  const handleFetchPrices = async () => {
    setFetchingPrices(true);
    setPriceMsg("");
    try {
      const res = await fetch("/api/holdings/fetch-prices", { method: "POST" });
      const data = await res.json();
      const parts: string[] = [];
      if (data.updated?.length) parts.push(`更新 ${data.updated.length} 个`);
      if (data.failed?.length) parts.push(`失败 ${data.failed.length} 个`);
      if (data.skipped?.length) parts.push(`跳过 ${data.skipped.length} 个`);
      setPriceMsg(parts.length > 0 ? parts.join("，") : "没有可自动更新的持仓");
      await fetchData();
    } catch {
      setPriceMsg("更新股价失败");
    }
    setFetchingPrices(false);
    setTimeout(() => setPriceMsg(""), 5000);
  };

  const handleMarketValueChange = (h: Holding, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setEdits((prev) => {
      const next = { ...prev, holdings: { ...prev.holdings } };
      const isShares = h.valuationMode === "shares" && h.shares > 0;
      const normalizedMarketValue = roundForStorage(num, "amount");
      const newPrice = isShares
        ? roundForStorage(normalizedMarketValue / h.shares, "price")
        : undefined;
      const originalMarketValue = roundForStorage(h.marketValue, "amount");
      const originalPrice = roundForStorage(h.price, "price");
      // Check if value is back to original
      if (
        normalizedMarketValue === originalMarketValue &&
        (!isShares || newPrice === originalPrice)
      ) {
        delete next.holdings[h.id];
      } else {
        next.holdings[h.id] = { marketValue: normalizedMarketValue, price: newPrice };
      }
      return next;
    });
  };

  const handlePriceChange = (h: Holding, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setEdits((prev) => {
      const next = { ...prev, holdings: { ...prev.holdings } };
      const normalizedPrice = roundForStorage(num, "price");
      const newMarketValue = roundForStorage(h.shares * normalizedPrice, "amount");
      const originalPrice = roundForStorage(h.price, "price");
      const originalMarketValue = roundForStorage(h.marketValue, "amount");
      if (normalizedPrice === originalPrice && newMarketValue === originalMarketValue) {
        delete next.holdings[h.id];
      } else {
        next.holdings[h.id] = { marketValue: newMarketValue, price: normalizedPrice };
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">✏️ 批量更新</h1>
        <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
          {priceMsg && <p className="text-xs text-muted-foreground md:hidden">{priceMsg}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            {priceMsg && (
              <span className="hidden text-xs text-muted-foreground md:inline">{priceMsg}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchPrices}
              disabled={fetchingPrices}
            >
              {fetchingPrices ? "更新中..." : "📡 更新股价"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? "保存中..." : "保存所有变更"}
            </Button>
          </div>
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
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{acc.name}</span>
                    <Badge variant="outline">{acc.currency}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground md:gap-4">
                    <span>
                      总价值 {sym}
                      {formatAmount(acc.accountValue)}
                    </span>
                    <span>
                      现金 {sym}
                      {formatAmount(acc.cashBalance)}
                    </span>
                  </div>
                </div>

                {accHoldings.length > 0 && (
                  <div className="space-y-2">
                    {accHoldings.map((h) => {
                      const edit = edits.holdings[h.id];
                      const isModified = !!edit;
                      const isShares = h.valuationMode === "shares";
                      const modifiedStyle = "border-blue-400 bg-blue-50";
                      const assetClassName = normalizeAssetClassName(h.assetClass);

                      return (
                        <div key={h.id} className="rounded-md border border-dashed p-3 text-sm">
                          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate">{h.name}</span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getAssetClassColor(assetClassName)}`}
                            >
                              {assetClassName}
                            </Badge>
                          </div>

                          {isShares ? (
                            <div className="flex flex-col gap-2 md:ml-auto md:flex-row md:items-center md:justify-end md:gap-4">
                              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                                <span className="w-10 shrink-0 text-xs text-muted-foreground">
                                  市值
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  className={`w-40 text-right md:w-36 ${isModified ? modifiedStyle : ""}`}
                                  value={
                                    edit
                                      ? edit.marketValue
                                      : roundForStorage(h.marketValue, "amount")
                                  }
                                  onChange={(e) => handleMarketValueChange(h, e.target.value)}
                                />
                              </div>
                              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                                <span className="w-10 shrink-0 text-xs text-muted-foreground">
                                  股数
                                </span>
                                <span className="inline-flex min-w-20 justify-end text-right tabular-nums">
                                  {formatShares(h.shares)}
                                </span>
                              </div>
                              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                                <span className="w-10 shrink-0 text-xs text-muted-foreground">
                                  股价
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.0001"
                                  className={`w-36 text-right md:w-32 ${isModified ? modifiedStyle : ""}`}
                                  value={
                                    edit?.price !== undefined
                                      ? edit.price
                                      : roundForStorage(h.price, "price")
                                  }
                                  onChange={(e) => handlePriceChange(h, e.target.value)}
                                  disabled={h.shares === 0}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">市值 ({sym})</span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                className={`w-full max-w-44 text-right ${isModified ? modifiedStyle : ""}`}
                                value={
                                  edit ? edit.marketValue : roundForStorage(h.marketValue, "amount")
                                }
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
