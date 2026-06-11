"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Holding, Account, AssetClass, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/utils/types";
import { useFetch, useTriFieldLinked } from "@/lib/utils/hooks";
import { getAssetClassColor } from "@/lib/visualization/asset-class-colors";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import { TransactionForm } from "@/components/transaction-form";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/utils/format";
import { useMutationJson } from "@/lib/cache/hooks";
import { entityOptimisticUpdate } from "@/lib/cache/optimistic";

interface HoldingFormProps {
  holding?: Holding;
  accountId: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function HoldingForm({
  holding,
  accountId,
  currency,
  open,
  onOpenChange,
  onSaved,
}: HoldingFormProps) {
  const [name, setName] = useState(holding?.name ?? "");
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [valuationMode, setValuationMode] = useState<"amount" | "shares">(
    holding?.valuationMode ?? "amount"
  );
  const [marketValue, setMarketValue] = useState(holding?.marketValue?.toString() ?? "");
  const [assetClass, setAssetClass] = useState<string>(
    normalizeAssetClassName(holding?.assetClass ?? "")
  );
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!holding;
  const sym = CURRENCY_SYMBOLS[currency];
  const mutation = useMutationJson<unknown, unknown>();

  // Tri-field linked editing for shares mode in edit mode
  const tri = useTriFieldLinked({
    price: holding?.price ?? 0,
    shares: holding?.shares ?? 0,
    marketValue: holding?.marketValue ?? 0,
  });

  useEffect(() => {
    if (open) {
      fetch("/api/asset-classes")
        .then((r) => r.json())
        .then((data: AssetClass[]) => {
          const filtered = data.filter((c) => c.name !== "现金");
          setAssetClasses(filtered);
          setAssetClass((prev) => prev || filtered[0]?.name || prev);
        });
    }
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);

    if (isEdit) {
      // Edit mode: send full payload with values
      const payload: {
        name: string;
        ticker: string | null;
        valuationMode: "amount" | "shares";
        assetClass: string;
        shares?: number;
        price?: number;
        marketValue?: number;
      } = {
        name,
        ticker: ticker || null,
        valuationMode,
        assetClass,
      };

      if (valuationMode === "shares") {
        payload.shares = parseFloat(tri.shares) || 0;
        payload.price = parseFloat(tri.price) || 0;
        payload.marketValue = parseFloat(tri.marketValue) || 0;
      } else {
        const mvVal = marketValue.trim() !== "" ? parseFloat(marketValue) : undefined;
        if (mvVal !== undefined) payload.marketValue = mvVal;
      }

      await mutation.mutateAsync({
        path: `/api/holdings/${holding.id}`,
        method: "PUT",
        mutationName: "holdings-write",
        optimistic: entityOptimisticUpdate,
        body: payload,
      });
    } else {
      // Create mode: only basic fields
      await mutation.mutateAsync({
        path: "/api/holdings",
        method: "POST",
        mutationName: "holdings-write",
        optimistic: entityOptimisticUpdate,
        body: {
          accountId,
          name,
          ticker: ticker || null,
          valuationMode,
          assetClass,
        },
      });
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const computedStyle = "text-muted-foreground italic";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑持仓" : "新建持仓"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：沪深300ETF"
              />
            </div>
            <div>
              <Label>代码（选填）</Label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="如：510300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>估值模式</Label>
              <Select
                value={valuationMode}
                onValueChange={(v) => setValuationMode(v as "amount" | "shares")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">金额模式</SelectItem>
                  <SelectItem value="shares">份额模式</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          {/* Edit mode: show value fields */}
          {isEdit && valuationMode === "shares" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={tri.computedField === "price" ? computedStyle : ""}>
                    股价 ({sym}) {tri.computedField === "price" && "·自动"}
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
          )}
          {isEdit && valuationMode === "amount" && (
            <div>
              <Label>市值 ({sym})</Label>
              <Input
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : isEdit ? "保存" : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HoldingsPanelProps {
  account: Account;
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  onBack: () => void;
  onDataChange: () => void;
}

export function HoldingsPanel({
  account,
  totalAssetCny,
  rates,
  colorMode,
  onBack,
  onDataChange,
}: HoldingsPanelProps) {
  const { data: allHoldings, refetch } = useFetch<Holding[]>("/api/holdings");
  const [createOpen, setCreateOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  // Quick transaction state
  const [txOpen, setTxOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState<string>("buy");
  const [txDefaultHoldingId, setTxDefaultHoldingId] = useState<number | undefined>();
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);
  const mutation = useMutationJson<never, unknown>();

  const holdings = (allHoldings ?? []).filter((h) => h.accountId === account.id);
  const sym = CURRENCY_SYMBOLS[account.currency];

  const toCny = (val: number) => {
    if (account.currency === "CNY") return val;
    const pair = `${account.currency}/CNY`;
    return val * (rates[pair] ?? 1);
  };

  const handleSaved = () => {
    refetch();
    onDataChange();
  };

  const openQuickTx = async (type: "buy" | "sell", holdingId: number) => {
    // Fetch accounts list for TransactionForm
    const res = await fetch("/api/accounts");
    const accs: Account[] = await res.json();
    setTxAccounts(accs);
    setTxDefaultType(type);
    setTxDefaultHoldingId(holdingId);
    setTxOpen(true);
  };

  const handleDelete = async (id: number) => {
    await mutation.mutateAsync({
      path: `/api/holdings/${id}`,
      method: "DELETE",
      mutationName: "holdings-write",
      optimistic: entityOptimisticUpdate,
    });
    handleSaved();
  };

  const holdingsTotal = holdings.reduce((s, h) => s + h.marketValue, 0);
  const cash = account.cashBalance;

  const calcReturn = (h: Holding) => {
    if (h.cost <= 0) return null;
    return ((h.marketValue - h.cost) / h.cost) * 100;
  };

  return (
    <div className="space-y-3">
      {/* Header: title left, back button right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{account.name}</h2>
          <Badge variant="outline">{account.currency}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          返回 →
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded p-3">
          <p className="text-muted-foreground">总额</p>
          <p className="font-semibold">
            {sym}
            {formatAmount(account.accountValue)}
          </p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">持仓</p>
          <p className="font-semibold">
            {sym}
            {formatAmount(holdingsTotal)}
          </p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">现金</p>
          <p className="font-semibold">
            {sym}
            {formatAmount(cash)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">持仓列表</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 新建持仓
        </Button>
      </div>

      {holdings.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">暂无持仓</p>
      ) : (
        <div className="space-y-2">
          {holdings.map((h) => {
            const valueCny = toCny(h.marketValue);
            const pctOfTotal = totalAssetCny > 0 ? (valueCny / totalAssetCny) * 100 : 0;
            const returnRate = calcReturn(h);
            return (
              <div key={h.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.name}</span>
                    {h.ticker && <span className="text-xs text-muted-foreground">{h.ticker}</span>}
                    <Badge
                      variant="secondary"
                      className={getAssetClassColor(normalizeAssetClassName(h.assetClass))}
                    >
                      {normalizeAssetClassName(h.assetClass)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {h.valuationMode === "shares" ? "份额" : "金额"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    本金 {sym}
                    {formatAmount(h.cost)}
                    {" · "}市值 {sym}
                    {formatAmount(h.marketValue)}
                    {account.currency !== "CNY" && ` ≈ ¥${formatAmount(valueCny)}`}
                    {" · "}占总资产 {formatPercent(pctOfTotal)}%
                  </p>
                  {h.valuationMode === "shares" && (
                    <p className="text-sm text-muted-foreground">
                      份额 {formatShares(h.shares)} · 股价 {sym}
                      {formatPrice(h.price)}
                      {h.shares > 0 && ` · 均价 ${sym}${formatPrice(h.cost / h.shares)}`}
                    </p>
                  )}
                  {returnRate !== null && (
                    <p className={`text-sm mt-0.5 ${pnlColorClass(returnRate, colorMode)}`}>
                      收益率 {returnRate > 0 ? "+" : ""}
                      {formatPercent(returnRate)}%
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sort-active"
                    onClick={() => openQuickTx("buy", h.id)}
                  >
                    买入
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-status-warning"
                    onClick={() => openQuickTx("sell", h.id)}
                  >
                    卖出
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditHolding(h)}>
                    编辑
                  </Button>
                  <Link href={`/transactions?accountId=${account.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      交易记录 →
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定删除持仓&ldquo;{h.name}&rdquo;？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(h.id)}>
                          确认
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HoldingForm
        accountId={account.id}
        currency={account.currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={handleSaved}
      />
      {editHolding && (
        <HoldingForm
          holding={editHolding}
          accountId={account.id}
          currency={account.currency}
          open={!!editHolding}
          onOpenChange={(open) => !open && setEditHolding(null)}
          onSaved={handleSaved}
        />
      )}

      <TransactionForm
        open={txOpen}
        onOpenChange={setTxOpen}
        onSaved={handleSaved}
        accounts={txAccounts}
        holdings={allHoldings ?? []}
        defaultType={txDefaultType}
        defaultAccountId={account.id}
        defaultHoldingId={txDefaultHoldingId}
      />
    </div>
  );
}
