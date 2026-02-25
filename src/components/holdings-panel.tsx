"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Holding, Account, AssetClass, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { useFetch, useTriFieldLinked } from "@/lib/hooks";
import { getAssetClassColor } from "@/lib/asset-class-colors";
import { TransactionForm } from "@/components/transaction-form";

interface HoldingFormProps {
  holding?: Holding;
  accountId: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function HoldingForm({ holding, accountId, currency, open, onOpenChange, onSaved }: HoldingFormProps) {
  const [name, setName] = useState(holding?.name ?? "");
  const [ticker, setTicker] = useState(holding?.ticker ?? "");
  const [valuationMode, setValuationMode] = useState<"amount" | "shares">(holding?.valuationMode ?? "amount");
  const [cost, setCost] = useState(holding?.cost?.toString() ?? "");
  const [marketValue, setMarketValue] = useState(holding?.marketValue?.toString() ?? "");
  // For create mode (non-linked)
  const [shares, setShares] = useState(holding?.shares?.toString() ?? "");
  const [price, setPrice] = useState(holding?.price?.toString() ?? "");
  const [assetClass, setAssetClass] = useState<string>(holding?.assetClass ?? "");
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!holding;
  const sym = CURRENCY_SYMBOLS[currency];

  // Tri-field linked editing for shares mode in edit mode
  const tri = useTriFieldLinked({
    price: holding?.price ?? 0,
    shares: holding?.shares ?? 0,
    marketValue: holding?.marketValue ?? 0,
  });
  const useLinked = isEdit && valuationMode === "shares";

  useEffect(() => {
    if (open) {
      fetch("/api/asset-classes")
        .then((r) => r.json())
        .then((data: AssetClass[]) => {
          const filtered = data.filter((c) => c.name !== "现金");
          setAssetClasses(filtered);
          if (!assetClass && filtered.length > 0) {
            setAssetClass(filtered[0].name);
          }
        });
    }
  }, [open]);

  const computedMarketValue = !useLinked && valuationMode === "shares"
    ? ((parseFloat(shares) || 0) * (parseFloat(price) || 0)).toFixed(2)
    : null;

  const handleSubmit = async () => {
    setSaving(true);
    const costVal = parseFloat(cost) || 0;

    const payload: Record<string, any> = {
      ...(isEdit ? {} : { accountId }),
      name,
      ticker: ticker || null,
      valuationMode,
      cost: costVal,
      assetClass,
    };

    if (valuationMode === "shares") {
      if (useLinked) {
        payload.shares = parseFloat(tri.shares) || 0;
        payload.price = parseFloat(tri.price) || 0;
        payload.marketValue = parseFloat(tri.marketValue) || 0;
      } else {
        payload.shares = parseFloat(shares) || 0;
        payload.price = parseFloat(price) || 0;
      }
    } else {
      const mvVal = marketValue.trim() !== "" ? parseFloat(marketValue) : undefined;
      if (mvVal !== undefined) payload.marketValue = mvVal;
    }

    const url = isEdit ? `/api/holdings/${holding.id}` : "/api/holdings";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const computedStyle = "text-muted-foreground italic";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑持仓" : "添加持仓"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>持仓名称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：沪深300ETF" />
            </div>
            <div>
              <Label>股票代码（选填）</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="如：510300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>估值模式</Label>
              <Select value={valuationMode} onValueChange={(v) => setValuationMode(v as "amount" | "shares")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">金额模式（手动市值）</SelectItem>
                  <SelectItem value="shares">份额模式（股价×份额）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>资产类别</Label>
              <Select value={assetClass} onValueChange={setAssetClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assetClasses.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>本金 ({sym})</Label>
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
            />
          </div>
          {valuationMode === "shares" ? (
            useLinked ? (
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
                      className={tri.computedField === "marketValue" ? "italic text-muted-foreground" : ""}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  编辑任意两个字段，第三个自动计算（标记为"·自动"）
                </p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>份额</Label>
                    <Input
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>股价 ({sym})</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                {computedMarketValue && (
                  <p className="text-sm text-muted-foreground">
                    市值（自动计算）：{sym}{parseFloat(computedMarketValue).toLocaleString()}
                  </p>
                )}
              </>
            )
          ) : (
            <div>
              <Label>市值 ({sym})（选填，不填则等于本金）</Label>
              <Input
                type="number"
                value={marketValue}
                onChange={(e) => setMarketValue(e.target.value)}
                placeholder="不填则等于本金"
              />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={saving || !name || !cost} className="w-full">
            {saving ? "保存中..." : "保存"}
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

export function HoldingsPanel({ account, totalAssetCny, rates, colorMode, onBack, onDataChange }: HoldingsPanelProps) {
  const { data: allHoldings, refetch } = useFetch<Holding[]>("/api/holdings");
  const [createOpen, setCreateOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);
  // Quick transaction state
  const [txOpen, setTxOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState<string>("buy");
  const [txDefaultHoldingId, setTxDefaultHoldingId] = useState<number | undefined>();
  const [txAccounts, setTxAccounts] = useState<Account[]>([]);

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
    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    handleSaved();
  };

  const holdingsTotal = holdings.reduce((s, h) => s + h.marketValue, 0);
  const cash = Math.max(0, account.totalBalance - holdingsTotal);

  const calcReturn = (h: Holding) => {
    if (h.cost <= 0) return null;
    return +(((h.marketValue - h.cost) / h.cost) * 100).toFixed(2);
  };

  return (
    <div className="space-y-3">
      {/* Header: title left, back button right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{account.name}</h2>
          <Badge variant="outline">{account.currency}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>返回 →</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded p-3">
          <p className="text-muted-foreground">总额</p>
          <p className="font-semibold">{sym}{account.totalBalance.toLocaleString()}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">持仓</p>
          <p className="font-semibold">{sym}{holdingsTotal.toLocaleString()}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">现金</p>
          <p className="font-semibold">{sym}{cash.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">持仓列表</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ 添加持仓</Button>
      </div>

      {holdings.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">暂无持仓</p>
      ) : (
        <div className="space-y-2">
          {holdings.map((h) => {
            const valueCny = toCny(h.marketValue);
            const pctOfTotal = totalAssetCny > 0 ? ((valueCny / totalAssetCny) * 100).toFixed(2) : "0";
            const returnRate = calcReturn(h);
            return (
              <div key={h.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.name}</span>
                    {h.ticker && <span className="text-xs text-muted-foreground">{h.ticker}</span>}
                    <Badge variant="secondary" className={getAssetClassColor(h.assetClass)}>
                      {h.assetClass}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {h.valuationMode === "shares" ? "份额" : "金额"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    本金 {sym}{h.cost.toLocaleString()}
                    {" · "}市值 {sym}{h.marketValue.toLocaleString()}
                    {account.currency !== "CNY" && ` ≈ ¥${valueCny.toLocaleString()}`}
                    {" · "}占总资产 {pctOfTotal}%
                  </p>
                  {h.valuationMode === "shares" && (
                    <p className="text-sm text-muted-foreground">
                      份额 {h.shares.toLocaleString()} · 股价 {sym}{h.price}
                      {h.shares > 0 && ` · 均价 ${sym}${(h.cost / h.shares).toFixed(4)}`}
                    </p>
                  )}
                  {returnRate !== null && (
                    <p className={`text-sm mt-0.5 ${pnlColorClass(returnRate, colorMode)}`}>
                      收益率 {returnRate > 0 ? "+" : ""}{returnRate.toFixed(2)}%
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-blue-600" onClick={() => openQuickTx("buy", h.id)}>买入</Button>
                  <Button variant="outline" size="sm" className="text-orange-600" onClick={() => openQuickTx("sell", h.id)}>卖出</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditHolding(h)}>编辑</Button>
                  <Link href={`/transactions?accountId=${account.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">交易记录 →</Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">删除</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>确定删除持仓"{h.name}"？</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(h.id)}>确认</AlertDialogAction>
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
