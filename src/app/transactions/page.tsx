"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TransactionForm } from "@/components/transaction-form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={<LoadingSpinner text="加载中..." className="py-8" />}
    >
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters - initialize from URL params
  const [filterAccount, setFilterAccount] = useState<string>(
    searchParams.get("accountId") || "all"
  );
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">交易记录</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ 新增交易</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="w-full md:w-48">
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
        <div className="w-full md:w-48">
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
        <LoadingSpinner text="加载中..." className="py-8" />
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无交易记录</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const sym = tx.accountCurrency ? CURRENCY_SYMBOLS[tx.accountCurrency] : "¥";
            return (
              <div key={tx.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={TX_TYPE_COLORS[tx.type] || ""}>
                      {TX_TYPE_LABELS[tx.type] || tx.type}
                    </Badge>
                    <span className="text-sm font-medium">{tx.accountName}</span>
                    {tx.holdingName && (
                      <Link href={`/accounts?accountId=${tx.accountId}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                        · {tx.holdingName}
                      </Link>
                    )}
                    {!tx.affectCash && !tx.affectHolding && (
                      <Badge variant="outline" className="text-xs">仅记录</Badge>
                    )}
                    {!tx.affectCash && tx.affectHolding && (
                      <Badge variant="outline" className="text-xs">不扣现金</Badge>
                    )}
                    {tx.affectCash && !tx.affectHolding && (
                      <Badge variant="outline" className="text-xs">不更新持仓</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
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
