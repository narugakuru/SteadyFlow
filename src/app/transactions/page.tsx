"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
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
import { formatAmount, formatPrice, formatShares } from "@/lib/format";

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
    <Suspense fallback={<LoadingSpinner text="加载中..." className="py-8" />}>
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 新增交易
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="w-full md:w-48">
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger>
              <SelectValue placeholder="全部账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账户</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
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
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">账户</th>
                <th className="text-left p-3 font-medium">标的名称</th>
                <th className="text-left p-3 font-medium">操作类型</th>
                <th className="text-right p-3 font-medium">股数</th>
                <th className="text-right p-3 font-medium">股价</th>
                <th className="text-right p-3 font-medium">金额</th>
                <th className="text-right p-3 font-medium">手续费</th>
                <th className="text-left p-3 font-medium">日期</th>
                <th className="text-center p-3 font-medium w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const sym = tx.accountCurrency ? CURRENCY_SYMBOLS[tx.accountCurrency] : "¥";
                return (
                  <tr key={tx.id} className="border-t hover:bg-accent/30 transition-colors">
                    <td className="p-3 whitespace-nowrap">{tx.accountName}</td>
                    <td className="p-3 whitespace-nowrap">
                      {tx.holdingName ? (
                        <Link
                          href={`/accounts?accountId=${tx.accountId}`}
                          className="hover:underline text-muted-foreground hover:text-foreground"
                        >
                          {tx.holdingName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge className={TX_TYPE_COLORS[tx.type] || ""}>
                          {TX_TYPE_LABELS[tx.type] || tx.type}
                        </Badge>
                        {!tx.affectCash && !tx.affectHolding && (
                          <Badge variant="outline" className="text-xs">
                            仅记录
                          </Badge>
                        )}
                        {!tx.affectCash && tx.affectHolding && (
                          <Badge variant="outline" className="text-xs">
                            不扣现金
                          </Badge>
                        )}
                        {tx.affectCash && !tx.affectHolding && (
                          <Badge variant="outline" className="text-xs">
                            不更新持仓
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {tx.shares != null ? formatShares(tx.shares) : "--"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {tx.price != null ? `${sym}${formatPrice(tx.price)}` : "--"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-medium">
                      {sym}
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {tx.fee > 0 ? `${sym}${formatAmount(tx.fee)}` : "--"}
                    </td>
                    <td className="p-3 whitespace-nowrap">{tx.date}</td>
                    <td className="p-3 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            aria-label="删除交易"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
                            <AlertDialogAction onClick={() => handleDelete(tx.id)}>
                              确认删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
