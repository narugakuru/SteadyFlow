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
import {
  PriceUpdateResult,
  PriceUpdateResultDialog,
} from "@/components/price-update-result-dialog";

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
  const [priceResult, setPriceResult] = useState<PriceUpdateResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

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
    try {
      const res = await fetch("/api/holdings/fetch-prices", { method: "POST" });
      const data: unknown = await res.json().catch(() => null);
      const result: PriceUpdateResult = {
        updated:
          data &&
          typeof data === "object" &&
          Array.isArray((data as { updated?: unknown[] }).updated)
            ? ((data as { updated: PriceUpdateResult["updated"] }).updated ?? [])
            : [],
        failed:
          data && typeof data === "object" && Array.isArray((data as { failed?: unknown[] }).failed)
            ? ((data as { failed: PriceUpdateResult["failed"] }).failed ?? [])
            : [],
        skipped:
          data &&
          typeof data === "object" &&
          Array.isArray((data as { skipped?: unknown[] }).skipped)
            ? ((data as { skipped: PriceUpdateResult["skipped"] }).skipped ?? [])
            : [],
      };
      setPriceResult(result);
      setResultOpen(true);
      await fetchData();
    } catch {
      setPriceResult({
        updated: [],
        failed: [{ id: -1, name: "系统", ticker: "-", error: "更新股价失败，请稍后重试" }],
        skipped: [],
      });
      setResultOpen(true);
    }
    setFetchingPrices(false);
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-2xl font-bold">✏️ 批量更新</h1>
        <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
            <Button
              variant="default" // 使用实色背景变体
              size="sm" // 保持较小尺寸以匹配界面
              onClick={handleFetchPrices} // 绑定点击事件
              disabled={fetchingPrices} // 正在获取时禁用
              // 核心样式：
              // bg-black / hover:bg-stone-900: 黑底色及悬停效果，符合软件冷静风格
              // text-white: 白字色
              // font-bold / shadow-md: 增强辨识度，使其在 outline 按钮旁更显眼
              className="bg-black hover:bg-stone-900 text-white font-bold shadow-md transition-all px-4 active:scale-95" // 添加 Tailwind 类名
            >
              {fetchingPrices ? (
                // 正在获取时的状态显示
                <span className="flex items-center gap-1">
                  <LoadingSpinner className="w-3 h-3 text-white" /> {/* 确保加载转圈也是白色 */}
                  正在连接市场...
                </span>
              ) : (
                // 默认状态显示
                "📡 更新股价"
              )}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? "保存中..." : "保存变更"}
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
              <div key={acc.id} className="border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{acc.name}</span>
                    <Badge variant="outline" className="font-mono">
                      {acc.currency}
                    </Badge>
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
                          {/* 资产名区域 */}
                          <div className="flex items-center gap-2 md:w-40 shrink-0 mb-3 md:mb-0">
                            <span className="font-medium truncate max-w-[120px] md:max-w-none">
                              {h.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1 py-0 leading-tight shrink-0 ${getAssetClassColor(assetClassName)}`}
                            >
                              {assetClassName}
                            </Badge>
                          </div>

                          {/* 控件区域 */}
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
                                  {/* 核心修正：添加 pr-2 并在移动端也保持一定的对齐感 */}
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
