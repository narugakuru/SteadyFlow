"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Transaction, Account, Holding, CURRENCY_SYMBOLS } from "@/lib/types";

const TX_TYPE_LABELS: Record<string, string> = {
  buy: "买入",
  sell: "卖出",
  dividend: "股息",
  deposit: "现金存入",
  withdraw: "现金取出",
};

const TX_TYPE_COLORS: Record<string, string> = {
  buy: "bg-blue-100 text-blue-800",
  sell: "bg-orange-100 text-orange-800",
  dividend: "bg-green-100 text-green-800",
  deposit: "bg-emerald-100 text-emerald-800",
  withdraw: "bg-red-100 text-red-800",
};

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  accounts: Account[];
  holdings: Holding[];
}

function TransactionForm({ open, onOpenChange, onSaved, accounts, holdings }: TransactionFormProps) {
  const [type, setType] = useState<string>("buy");
  const [accountId, setAccountId] = useState<string>("");
  const [holdingId, setHoldingId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [txShares, setTxShares] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [affectBalance, setAffectBalance] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setType("buy");
      setAccountId(accounts.length > 0 ? String(accounts[0].id) : "");
      setHoldingId("");
      setAmount("");
      setTxShares("");
      setTxPrice("");
      setFee("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setAffectBalance(true);
      setError("");
    }
  }, [open, accounts]);

  const needsHolding = type === "buy" || type === "sell";
  const optionalHolding = type === "dividend";
  const accountHoldings = holdings.filter((h) => h.accountId === Number(accountId));
  const selectedHolding = holdings.find((h) => h.id === Number(holdingId));
  const isSharesMode = selectedHolding?.valuationMode === "shares";

  const account = accounts.find((a) => a.id === Number(accountId));
  const sym = account ? CURRENCY_SYMBOLS[account.currency] : "¥";

  // Auto-calculate amount for shares mode
  const computedAmount = isSharesMode && txShares && txPrice
    ? (parseFloat(txShares) * parseFloat(txPrice)).toFixed(2)
    : null;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");

    const payload: Record<string, any> = {
      accountId: Number(accountId),
      type,
      date,
      amount: computedAmount ? parseFloat(computedAmount) : parseFloat(amount) || 0,
      fee: parseFloat(fee) || 0,
      affectBalance,
      note: note || null,
    };

    if (holdingId) {
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
      const data = await res.json();
      setError(data.error || "创建失败");
      setSaving(false);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const canSubmit = accountId && date && (
    (needsHolding && holdingId && (isSharesMode ? (txShares && txPrice) : amount)) ||
    (optionalHolding && amount) ||
    (!needsHolding && !optionalHolding && amount)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增交易</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>交易类型</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setHoldingId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Select value={accountId} onValueChange={(v) => { setAccountId(v); setHoldingId(""); }}>
              <SelectTrigger><SelectValue placeholder="选择账户" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(needsHolding || optionalHolding) && accountId && (
            <div>
              <Label>{needsHolding ? "持仓" : "关联持仓（选填）"}</Label>
              <Select value={holdingId} onValueChange={setHoldingId}>
                <SelectTrigger><SelectValue placeholder="选择持仓" /></SelectTrigger>
                <SelectContent>
                  {optionalHolding && <SelectItem value="none">不关联持仓</SelectItem>}
                  {accountHoldings.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name} {h.ticker ? `(${h.ticker})` : ""} [{h.valuationMode === "shares" ? "份额" : "金额"}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isSharesMode && needsHolding ? (
            <>
              <div className="grid grid-cols-2 gap-4">
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
                  金额（自动计算）：{sym}{parseFloat(computedAmount).toLocaleString()}
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
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label>备注（选填）</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="如：定投第3期"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="affect-balance" className="cursor-pointer">影响账户余额</Label>
            <Switch
              id="affect-balance"
              checked={affectBalance}
              onCheckedChange={setAffectBalance}
            />
          </div>
          {!affectBalance && (
            <p className="text-xs text-muted-foreground">关闭后仅记录交易，不修改持仓和账户数据（适用于补录历史记录）</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={saving || !canSubmit} className="w-full">
            {saving ? "保存中..." : "确认"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAccount !== "all") params.set("accountId", filterAccount);
    if (filterType !== "all") params.set("type", filterType);

    const [txRes, accRes, holdRes] = await Promise.all([
      fetch(`/api/transactions?${params}`),
      fetch("/api/accounts"),
      fetch("/api/holdings"),
    ]);
    const [txData, accData, holdData] = await Promise.all([
      txRes.json(),
      accRes.json(),
      holdRes.json(),
    ]);
    setTransactions(txData);
    setAccounts(accData);
    setHoldings(holdData);
    setLoading(false);
  }, [filterAccount, filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">交易记录</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ 新增交易</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger><SelectValue placeholder="全部账户" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账户</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="buy">买入</SelectItem>
              <SelectItem value="sell">卖出</SelectItem>
              <SelectItem value="dividend">股息</SelectItem>
              <SelectItem value="deposit">现金存入</SelectItem>
              <SelectItem value="withdraw">现金取出</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <p className="text-muted-foreground text-center py-8">加载中...</p>
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无交易记录</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const sym = tx.accountCurrency ? CURRENCY_SYMBOLS[tx.accountCurrency] : "¥";
            return (
              <div key={tx.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={TX_TYPE_COLORS[tx.type] || ""}>
                      {TX_TYPE_LABELS[tx.type] || tx.type}
                    </Badge>
                    <span className="text-sm font-medium">{tx.accountName}</span>
                    {tx.holdingName && (
                      <span className="text-sm text-muted-foreground">· {tx.holdingName}</span>
                    )}
                    {!tx.affectBalance && (
                      <Badge variant="outline" className="text-xs">仅记录</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{sym}{tx.amount.toLocaleString()}</span>
                    {tx.shares != null && <span>股数: {tx.shares}</span>}
                    {tx.price != null && <span>价格: {sym}{tx.price}</span>}
                    {tx.fee > 0 && <span>手续费: {sym}{tx.fee}</span>}
                    {tx.note && <span>· {tx.note}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tx.date}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">删除</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        删除此交易记录？注意：删除不会回滚对持仓和账户的修改。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(tx.id)}>确认删除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}

      <TransactionForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={fetchData}
        accounts={accounts}
        holdings={holdings}
      />
    </div>
  );
}
