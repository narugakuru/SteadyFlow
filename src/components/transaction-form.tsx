"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account, Holding, AssetClass, CURRENCY_SYMBOLS } from "@/lib/types";
import { formatAmount, roundForStorage } from "@/lib/format";

export interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  accounts: Account[];
  holdings: Holding[];
  /** Pre-fill defaults */
  defaultType?: string;
  defaultAccountId?: number;
  defaultHoldingId?: number;
  /** Callback to refresh holdings list (e.g. after inline create) */
  onHoldingsRefresh?: () => Promise<void>;
}

export function TransactionForm({
  open,
  onOpenChange,
  onSaved,
  accounts,
  holdings,
  defaultType,
  defaultAccountId,
  defaultHoldingId,
  onHoldingsRefresh,
}: TransactionFormProps) {
  const [type, setType] = useState<string>("buy");
  const [accountId, setAccountId] = useState<string>("");
  const [holdingId, setHoldingId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [txShares, setTxShares] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [affectCash, setAffectCash] = useState(true);
  const [affectHolding, setAffectHolding] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Inline holding creation
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);
  const [newHoldingName, setNewHoldingName] = useState("");
  const [newHoldingTicker, setNewHoldingTicker] = useState("");
  const [newHoldingMode, setNewHoldingMode] = useState<"amount" | "shares">("shares");
  const [newHoldingAssetClass, setNewHoldingAssetClass] = useState("");
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [creatingSaving, setCreatingSaving] = useState(false);
  // Local holdings list that can be refreshed after inline create
  const [localHoldings, setLocalHoldings] = useState<Holding[]>(holdings);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setType(defaultType || "buy");
      setAccountId(
        defaultAccountId
          ? String(defaultAccountId)
          : accounts.length > 0
            ? String(accounts[0].id)
            : ""
      );
      setHoldingId(defaultHoldingId ? String(defaultHoldingId) : "");
      setAmount("");
      setTxShares("");
      setTxPrice("");
      setFee("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setAffectCash(true);
      setAffectHolding(true);
      setError("");
      setInlineCreateOpen(false);
      setLocalHoldings(holdings);
    }
  }, [open, accounts, holdings, defaultType, defaultAccountId, defaultHoldingId]);

  const needsHolding = type === "buy" || type === "sell";
  const optionalHolding = type === "dividend";
  const accountHoldings = localHoldings.filter((h) => h.accountId === Number(accountId));
  const selectedHolding = localHoldings.find((h) => h.id === Number(holdingId));
  const isSharesMode = selectedHolding?.valuationMode === "shares";

  const account = accounts.find((a) => a.id === Number(accountId));
  const sym = account ? CURRENCY_SYMBOLS[account.currency] : "¥";

  // Auto-calculate amount for shares mode
  const computedAmount =
    isSharesMode && txShares && txPrice
      ? roundForStorage(parseFloat(txShares) * parseFloat(txPrice), "amount")
      : null;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      accountId: Number(accountId),
      type,
      date,
      amount: computedAmount ?? (parseFloat(amount) || 0),
      fee: parseFloat(fee) || 0,
      affectCash,
      affectHolding,
      note: note || null,
    };

    if (holdingId && holdingId !== "none") {
      payload.holdingId = Number(holdingId);
    }

    if (isSharesMode && (type === "buy" || type === "sell")) {
      payload.shares = parseFloat(txShares) || 0;
      payload.price = parseFloat(txPrice) || 0;
    }

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMsg = "创建失败";
      try {
        const data = await res.json();
        errorMsg = data.error || errorMsg;
      } catch {
        // response body is not valid JSON
      }
      setError(errorMsg);
      setSaving(false);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const canSubmit =
    accountId &&
    date &&
    ((needsHolding &&
      holdingId &&
      holdingId !== "none" &&
      (isSharesMode ? txShares && txPrice : amount)) ||
      (optionalHolding && amount) ||
      (!needsHolding && !optionalHolding && amount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>新增交易</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>交易类型</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v);
                setHoldingId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">买入</SelectItem>
                <SelectItem value="sell">卖出</SelectItem>
                <SelectItem value="dividend">股息</SelectItem>
                <SelectItem value="deposit">现金存入</SelectItem>
                <SelectItem value="withdraw">现金取出</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>账户</Label>
            <Select
              value={accountId}
              onValueChange={(v) => {
                setAccountId(v);
                setHoldingId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {accountId && (
            <div className="flex items-center justify-between pl-1">
              <Label htmlFor="affect-cash" className="cursor-pointer text-sm text-muted-foreground">
                影响账户现金
              </Label>
              <Switch id="affect-cash" checked={affectCash} onCheckedChange={setAffectCash} />
            </div>
          )}
          {accountId && !affectCash && (
            <p className="text-xs text-muted-foreground pl-1">
              不扣减/增加账户现金（适用于录入已有持仓）
            </p>
          )}

          {(needsHolding || optionalHolding) && accountId && (
            <div>
              <Label>{needsHolding ? "持仓" : "关联持仓（选填）"}</Label>
              <Select
                value={holdingId}
                onValueChange={(v) => {
                  if (v === "__new__") {
                    setInlineCreateOpen(true);
                    setNewHoldingMode("shares");
                    // Fetch asset classes for the mini form
                    fetch("/api/asset-classes")
                      .then((r) => r.json())
                      .then((data: AssetClass[]) => {
                        const filtered = data.filter((c) => c.name !== "现金");
                        setAssetClasses(filtered);
                        if (filtered.length > 0) setNewHoldingAssetClass(filtered[0].name);
                      });
                    return;
                  }
                  setHoldingId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择持仓" />
                </SelectTrigger>
                <SelectContent>
                  {optionalHolding && <SelectItem value="none">不关联持仓</SelectItem>}
                  {accountHoldings.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name} {h.ticker ? `(${h.ticker})` : ""} [
                      {h.valuationMode === "shares" ? "份额" : "金额"}]
                    </SelectItem>
                  ))}
                  {needsHolding && <SelectItem value="__new__">➕ 新建持仓...</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === "buy" || type === "sell") && holdingId && holdingId !== "none" && (
            <div className="flex items-center justify-between pl-1">
              <Label
                htmlFor="affect-holding"
                className="cursor-pointer text-sm text-muted-foreground"
              >
                影响持仓数据
              </Label>
              <Switch
                id="affect-holding"
                checked={affectHolding}
                onCheckedChange={setAffectHolding}
              />
            </div>
          )}
          {(type === "buy" || type === "sell") &&
            holdingId &&
            holdingId !== "none" &&
            !affectHolding && (
              <p className="text-xs text-muted-foreground pl-1">不更新持仓数据（仅影响现金）</p>
            )}

          {/* Inline holding creation mini-form */}
          {inlineCreateOpen && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">新建持仓</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">名称</Label>
                  <Input
                    value={newHoldingName}
                    onChange={(e) => setNewHoldingName(e.target.value)}
                    placeholder="如：沪深300ETF"
                  />
                </div>
                <div>
                  <Label className="text-xs">代码（选填）</Label>
                  <Input
                    value={newHoldingTicker}
                    onChange={(e) => setNewHoldingTicker(e.target.value)}
                    placeholder="aapl.us / 600519.SS"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">估值模式</Label>
                  <Select
                    value={newHoldingMode}
                    onValueChange={(v) => setNewHoldingMode(v as "amount" | "shares")}
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
                  <Label className="text-xs">资产类别</Label>
                  <Select value={newHoldingAssetClass} onValueChange={setNewHoldingAssetClass}>
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={creatingSaving || !newHoldingName}
                  onClick={async () => {
                    setCreatingSaving(true);
                    const res = await fetch("/api/holdings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        accountId: Number(accountId),
                        name: newHoldingName,
                        ticker: newHoldingTicker || null,
                        valuationMode: newHoldingMode,
                        assetClass: newHoldingAssetClass,
                      }),
                    });
                    const created = await res.json();
                    // Refresh local holdings
                    const holdRes = await fetch("/api/holdings");
                    const allHoldings: Holding[] = await holdRes.json();
                    setLocalHoldings(allHoldings);
                    if (onHoldingsRefresh) await onHoldingsRefresh();
                    // Auto-select the new holding
                    setHoldingId(String(created.id));
                    // Reset mini form
                    setNewHoldingName("");
                    setNewHoldingTicker("");
                    setNewHoldingMode("shares");
                    setInlineCreateOpen(false);
                    setCreatingSaving(false);
                  }}
                >
                  {creatingSaving ? "创建中..." : "创建"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setInlineCreateOpen(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {isSharesMode && needsHolding ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>股数</Label>
                  <Input
                    type="number"
                    value={txShares}
                    onChange={(e) => setTxShares(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>成交价 ({sym})</Label>
                  <Input
                    type="number"
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              {computedAmount && (
                <p className="text-sm text-muted-foreground">
                  金额（自动计算）：{sym}
                  {formatAmount(computedAmount)}
                </p>
              )}
            </>
          ) : (
            <div>
              <Label>金额 ({sym})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div>
            <Label>手续费 ({sym})（选填）</Label>
            <Input
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label>交易日期</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>备注（选填）</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如：定投第3期"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={saving || !canSubmit} className="w-full">
            {saving ? "保存中..." : "确认"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
