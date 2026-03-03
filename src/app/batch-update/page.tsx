"use client";

import { useMemo, useState } from "react";

import { DataFreshness } from "@/components/data-freshness";
import {
  PriceUpdateResult,
  PriceUpdateResultDialog,
} from "@/components/price-update-result-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAssetClassColor } from "@/lib/asset-class-colors";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";
import { normalizeAssetClassName } from "@/lib/asset-class";
import { Account, CURRENCY_SYMBOLS, Holding } from "@/lib/types";
import { formatAmount, formatShares, roundForStorage } from "@/lib/format";

interface HoldingEdit {
  marketValue: number;
  price?: number;
}

interface EditState {
  holdings: Record<number, HoldingEdit>;
}

export default function BatchUpdatePage() {
  const [edits, setEdits] = useState<EditState>({ holdings: {} });
  const [priceResult, setPriceResult] = useState<PriceUpdateResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const accountsQuery = useUserScopedQuery<Account[]>({
    name: "accounts",
    path: "/api/accounts",
  });

  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: "/api/holdings",
  });

  const mutation = useMutationJson<unknown, unknown>();

  const accounts = accountsQuery.data ?? [];
  const holdings = holdingsQuery.data ?? [];
  const loading =
    (accountsQuery.isLoading && accounts.length === 0) ||
    (holdingsQuery.isLoading && holdings.length === 0);
  const hasChanges = Object.keys(edits.holdings).length > 0;
  const fetchingPrices = mutation.isPending;
  const saving = mutation.isPending;

  const lastUpdatedAt = useMemo(
    () => Math.max(accountsQuery.dataUpdatedAt || 0, holdingsQuery.dataUpdatedAt || 0),
    [accountsQuery.dataUpdatedAt, holdingsQuery.dataUpdatedAt]
  );

  const refreshAll = async () => {
    await Promise.all([accountsQuery.refetch(), holdingsQuery.refetch()]);
    setEdits({ holdings: {} });
  };

  const handleFetchPrices = async () => {
    try {
      const data = await mutation.mutateAsync({
        path: "/api/holdings/fetch-prices",
        method: "POST",
        mutationName: "fetch-prices-write",
      });
      const safeData = data as {
        updated?: PriceUpdateResult["updated"];
        failed?: PriceUpdateResult["failed"];
        skipped?: PriceUpdateResult["skipped"];
      };
      setPriceResult({
        updated: Array.isArray(safeData.updated) ? safeData.updated : [],
        failed: Array.isArray(safeData.failed) ? safeData.failed : [],
        skipped: Array.isArray(safeData.skipped) ? safeData.skipped : [],
      });
      setResultOpen(true);
      await refreshAll();
    } catch {
      setPriceResult({
        updated: [],
        failed: [{ id: -1, name: "系统", ticker: "-", error: "更新股价失败，请稍后重试" }],
        skipped: [],
      });
      setResultOpen(true);
    }
  };

  const handleMarketValueChange = (h: Holding, value: string) => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    setEdits((prev) => {
      const next = { ...prev, holdings: { ...prev.holdings } };
      const isShares = h.valuationMode === "shares" && h.shares > 0;
      const normalizedMarketValue = roundForStorage(num, "amount");
      const newPrice = isShares
        ? roundForStorage(normalizedMarketValue / h.shares, "price")
        : undefined;
      const originalMarketValue = roundForStorage(h.marketValue, "amount");
      const originalPrice = roundForStorage(h.price, "price");

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
    if (Number.isNaN(num)) return;
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
    await mutation.mutateAsync({
      path: "/api/batch-update",
      method: "PUT",
      mutationName: "batch-update-write",
      body: {
        holdings: Object.entries(edits.holdings).map(([id, edit]) => ({
          id: Number(id),
          marketValue: edit.marketValue,
          ...(edit.price !== undefined ? { price: edit.price } : {}),
        })),
      },
    });
    await refreshAll();
  };

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-screen" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">✏️ 批量更新</h1>
        <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={handleFetchPrices}
              disabled={fetchingPrices}
              className="bg-black hover:bg-stone-900 text-white font-bold shadow-md transition-all px-4 active:scale-95"
            >
              {fetchingPrices ? (
                <span className="flex items-center gap-1">
                  <LoadingSpinner className="w-3 h-3 text-white" />
                  正在连接市场...
                </span>
              ) : (
                "📡 更新股价"
              )}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? "保存中..." : "保存变更"}
            </Button>
          </div>
        </div>
      </div>

      <DataFreshness
        updatedAt={lastUpdatedAt}
        isFetching={accountsQuery.isFetching || holdingsQuery.isFetching}
      />

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
              <div key={acc.id} className="border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{acc.name}</span>
                    <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono">
                      {acc.currency}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      总价值: {sym}
                      {formatAmount(acc.accountValue)}
                    </span>
                    <span>
                      现金: {sym}
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
                      const modifiedStyle = "border-blue-400 bg-blue-50/50";
                      const assetClassName = normalizeAssetClassName(h.assetClass);

                      return (
                        <div
                          key={h.id}
                          className="rounded-md border border-dashed p-3 text-sm flex flex-col md:flex-row md:items-center transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-2 md:w-40 shrink-0 mb-3 md:mb-0">
                            <span className="font-medium truncate max-w-[120px] md:max-w-none">
                              {h.name}
                            </span>
                            <span
                              className={`inline-flex items-center rounded px-1 py-0 text-[10px] leading-tight shrink-0 ${getAssetClassColor(assetClassName)}`}
                            >
                              {assetClassName}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:ml-auto md:gap-4 lg:gap-6">
                            {isShares ? (
                              <>
                                <div className="flex items-center justify-between md:justify-end gap-2">
                                  <span className="text-[11px] text-muted-foreground shrink-0">
                                    市值
                                  </span>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    className={`w-28 text-right tabular-nums h-8 text-xs ${isModified ? modifiedStyle : ""}`}
                                    value={
                                      edit
                                        ? edit.marketValue
                                        : roundForStorage(h.marketValue, "amount")
                                    }
                                    onChange={(e) => handleMarketValueChange(h, e.target.value)}
                                  />
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-2">
                                  <span className="text-[11px] text-muted-foreground shrink-0">
                                    股数
                                  </span>
                                  <span className="w-28 md:w-16 text-right tabular-nums font-medium text-xs pr-2">
                                    {formatShares(h.shares)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-2">
                                  <span className="text-[11px] text-muted-foreground shrink-0">
                                    股价
                                  </span>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    className={`w-28 text-right tabular-nums h-8 text-xs ${isModified ? modifiedStyle : ""}`}
                                    value={
                                      edit?.price !== undefined
                                        ? edit.price
                                        : roundForStorage(h.price, "price")
                                    }
                                    onChange={(e) => handlePriceChange(h, e.target.value)}
                                    disabled={h.shares === 0}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                  市值 ({sym})
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  className={`w-28 text-right tabular-nums h-8 text-xs ${isModified ? modifiedStyle : ""}`}
                                  value={
                                    edit
                                      ? edit.marketValue
                                      : roundForStorage(h.marketValue, "amount")
                                  }
                                  onChange={(e) => handleMarketValueChange(h, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {accHoldings.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-2 italic">暂无持仓</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PriceUpdateResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={priceResult}
      />
    </div>
  );
}
