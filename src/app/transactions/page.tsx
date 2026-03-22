"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";

import { DataFreshness } from "@/components/data-freshness";
import { PageContainer } from "@/components/page-container";
import { TransactionForm } from "@/components/transaction-form";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";
import {
  Account,
  CURRENCY_SYMBOLS,
  Holding,
  Settings,
  Transaction,
  pnlColorClass,
} from "@/lib/utils/types";
import { formatAmount, formatPrice, formatShares } from "@/lib/utils/format";

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
  const [createOpen, setCreateOpen] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>(
    searchParams.get("accountId") || "all"
  );
  const [filterType, setFilterType] = useState<string>("all");

  const txQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filterAccount !== "all") params.set("accountId", filterAccount);
    if (filterType !== "all") params.set("type", filterType);
    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
  }, [filterAccount, filterType]);

  const txQuery = useUserScopedQuery<Transaction[]>({
    name: "transactions",
    path: `/api/transactions${txQueryString}`,
    params: {
      accountId: filterAccount === "all" ? null : filterAccount,
      type: filterType === "all" ? null : filterType,
    },
  });

  const accountsQuery = useUserScopedQuery<Account[]>({
    name: "accounts",
    path: "/api/accounts",
  });

  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: "/api/holdings",
  });

  const settingsQuery = useUserScopedQuery<Settings>({
    name: "settings",
    path: "/api/settings",
  });

  const deleteTxMutation = useMutationJson<never, unknown>();

  const loading =
    txQuery.sessionStatus === "loading" ||
    (txQuery.isLoading && !txQuery.data) ||
    (accountsQuery.isLoading && !accountsQuery.data) ||
    (holdingsQuery.isLoading && !holdingsQuery.data) ||
    (settingsQuery.isLoading && !settingsQuery.data);

  const transactions = txQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const holdings = holdingsQuery.data ?? [];
  const colorMode = settingsQuery.data?.colorMode ?? "cn";

  const refreshAll = async () => {
    await Promise.all([txQuery.refetch(), accountsQuery.refetch(), holdingsQuery.refetch()]);
  };

  const handleDelete = async (id: number) => {
    await deleteTxMutation.mutateAsync({
      path: `/api/transactions/${id}`,
      method: "DELETE",
      mutationName: "transactions-write",
    });
    await txQuery.refetch();
  };

  return (
    <PageContainer className="space-y-4 py-4 md:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">交易记录</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 新增交易
        </Button>
      </div>

      <DataFreshness updatedAt={txQuery.dataUpdatedAt} isFetching={txQuery.isFetching} />

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

      {loading ? (
        <LoadingSpinner text="加载中..." className="py-8" />
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无交易记录</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm table-auto">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium whitespace-nowrap">账户</th>
                <th className="text-left p-3 font-medium whitespace-nowrap">标的名称</th>
                <th className="text-left p-3 font-medium whitespace-nowrap">操作类型</th>
                <th className="text-right p-3 font-medium whitespace-nowrap">股数</th>
                <th className="text-right p-3 font-medium whitespace-nowrap">股价</th>
                <th className="text-right p-3 font-medium whitespace-nowrap">金额</th>
                <th className="text-right p-3 font-medium whitespace-nowrap">手续费</th>
                <th className="text-right p-3 font-medium whitespace-nowrap">盈亏</th>
                <th className="text-left p-3 font-medium whitespace-nowrap">日期</th>
                <th className="text-center p-3 font-medium w-16 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const sym = tx.accountCurrency ? CURRENCY_SYMBOLS[tx.accountCurrency] : "¥";
                const hasRealizedPnl = tx.type === "sell" && tx.affectHolding;
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
                        {tx.type === "sell" && !tx.affectHolding && (
                          <Badge variant="outline" className="text-xs">
                            不计入了结
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
                    <td
                      className={`p-3 text-right whitespace-nowrap ${
                        hasRealizedPnl
                          ? pnlColorClass(tx.realizedPnl, colorMode)
                          : "text-muted-foreground"
                      }`}
                    >
                      {hasRealizedPnl
                        ? `${tx.realizedPnl > 0 ? "+" : ""}${sym}${formatAmount(tx.realizedPnl)}`
                        : "--"}
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
                              删除此交易记录？注意：删除不会回滚对持仓和账户现金的修改；若该交易计入了结盈亏，会同步回退累计值。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleDelete(tx.id)}>
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
        onSaved={() => void refreshAll()}
        accounts={accounts}
        holdings={holdings}
      />
    </PageContainer>
  );
}
