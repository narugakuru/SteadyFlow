"use client";

import { useState, useEffect, Fragment } from "react";
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
import { Account, Holding, AssetClass, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/utils/types";
import { Pencil, Trash2 } from "lucide-react";
import { HoldingRow } from "@/components/holding-row";
import { HoldingSortDialog } from "@/components/holding-sort-dialog";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";

// ─── Account Form (create/edit) ───

interface AccountFormProps {
  account?: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function AccountForm({ account, open, onOpenChange, onSaved }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? "");
  const [currency, setCurrency] = useState<string>(account?.currency ?? "CNY");
  const [cashBalance, setCashBalance] = useState(account?.cashBalance?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!account;
  const mutation = useMutationJson<
    { name: string; currency: string; cashBalance: number },
    Account
  >();

  const handleSubmit = async () => {
    setSaving(true);
    const url = isEdit ? `/api/accounts/${account.id}` : "/api/accounts";
    await mutation.mutateAsync({
      path: url,
      method: isEdit ? "PUT" : "POST",
      mutationName: "accounts-write",
      body: {
        name,
        currency,
        cashBalance: parseFloat(cashBalance) || 0,
      },
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑账户" : "添加账户"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>账户名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：A股券商"
            />
          </div>
          <div>
            <Label>币种</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CNY">CNY (人民币)</SelectItem>
                <SelectItem value="USD">USD (美元)</SelectItem>
                <SelectItem value="HKD">HKD (港币)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {isEdit ? "现金余额" : "初始现金"} ({CURRENCY_SYMBOLS[currency]})
            </Label>
            <Input
              type="number"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Holding Form (simplified, for adding new holdings) ───

interface HoldingFormProps {
  accountId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function HoldingForm({ accountId, open, onOpenChange, onSaved }: HoldingFormProps) {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [valuationMode, setValuationMode] = useState<"amount" | "shares">("shares");
  const [assetClass, setAssetClass] = useState("");
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [saving, setSaving] = useState(false);
  const mutation = useMutationJson<
    {
      accountId: number;
      name: string;
      ticker: string | null;
      valuationMode: "amount" | "shares";
      assetClass: string;
    },
    Holding
  >();

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setTicker("");
      setValuationMode("shares");
      fetch("/api/asset-classes")
        .then((r) => r.json())
        .then((data: AssetClass[]) => {
          const filtered = data.filter((c) => c.name !== "现金");
          setAssetClasses(filtered);
          if (filtered.length > 0) setAssetClass(filtered[0].name);
        });
    }
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);
    await mutation.mutateAsync({
      path: "/api/holdings",
      method: "POST",
      mutationName: "holdings-write",
      body: {
        accountId,
        name,
        ticker: ticker || null,
        valuationMode,
        assetClass,
      },
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建持仓</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                placeholder="aapl.us / 600519.SS"
              />
              <p className="text-xs text-muted-foreground mt-1">
                美股 .us · 日股 .jp · A股 .SS/.SZ · 港股 .HK
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <Button onClick={handleSubmit} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account List (expand/collapse mode) ───

interface AccountListProps {
  accounts: Account[];
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  defaultExpandId?: number;
  onRefresh: () => void;
}

export function AccountList({
  accounts,
  totalAssetCny,
  rates,
  colorMode,
  defaultExpandId,
  onRefresh,
}: AccountListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(
    defaultExpandId ? new Set([defaultExpandId]) : new Set()
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [addHoldingFor, setAddHoldingFor] = useState<Account | null>(null);
  const [sortHoldingFor, setSortHoldingFor] = useState<Account | null>(null);
  const [priceMsg, setPriceMsg] = useState("");
  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: "/api/holdings",
  });
  const mutation = useMutationJson<unknown, unknown>();
  const allHoldings = holdingsQuery.data ?? [];
  const fetchingPrices = mutation.isPending;
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

  const handleFetchPrices = async () => {
    setPriceMsg("");
    try {
      const data = (await mutation.mutateAsync({
        path: "/api/holdings/fetch-prices",
        method: "POST",
        mutationName: "fetch-prices-write",
      })) as {
        updated?: unknown[];
        failed?: unknown[];
        skipped?: unknown[];
      };
      const parts: string[] = [];
      if (data.updated?.length) parts.push(`更新 ${data.updated.length} 个`);
      if (data.failed?.length) parts.push(`失败 ${data.failed.length} 个`);
      if (data.skipped?.length) parts.push(`跳过 ${data.skipped.length} 个`);
      setPriceMsg(parts.length > 0 ? parts.join("，") : "没有可自动更新的持仓");
      await holdingsQuery.refetch();
      onRefresh();
    } catch {
      setPriceMsg("更新股价失败");
    }
    setTimeout(() => setPriceMsg(""), 5000);
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteAccount = async (id: number) => {
    await mutation.mutateAsync({
      path: `/api/accounts/${id}`,
      method: "DELETE",
      mutationName: "accounts-write",
    });
    onRefresh();
    await holdingsQuery.refetch();
  };

  const handleDeleteHolding = async (id: number) => {
    await mutation.mutateAsync({
      path: `/api/holdings/${id}`,
      method: "DELETE",
      mutationName: "holdings-write",
    });
    await holdingsQuery.refetch();
    onRefresh();
  };

  const handleDataChange = () => {
    void holdingsQuery.refetch();
    onRefresh();
  };

  // Shared expanded detail content
  const renderExpandedDetail = (a: Account) => {
    const sym = CURRENCY_SYMBOLS[a.currency];
    const accountHoldings = allHoldings
      .filter((h) => h.accountId === a.id)
      .sort((x, y) => x.accountSortOrder - y.accountSortOrder || x.id - y.id);
    const holdingsTotal = accountHoldings.reduce((s, h) => s + h.marketValue, 0);

    return (
      <div className="bg-muted/20 px-3 md:px-4 py-3">
        {/* Account summary */}
        <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm mb-3">
          <span>
            总价值{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(a.accountValue)}
            </span>
          </span>
          <span>
            持仓{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(holdingsTotal)}
            </span>
          </span>
          <span>
            现金{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(a.cashBalance)}
            </span>
          </span>
          <div className="flex-1 hidden md:block" />
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={() => setEditAccount(a)}>
              ✏️ 编辑账户
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddHoldingFor(a)}>
              + 新建持仓
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortHoldingFor(a)}
              disabled={accountHoldings.length <= 1}
            >
              ↕ 排序持仓
            </Button>
          </div>
        </div>
        {/* Holdings list */}
        {accountHoldings.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2">暂无持仓</p>
        ) : (
          <div className="space-y-0.5">
            {accountHoldings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                currency={a.currency}
                totalAssetCny={totalAssetCny}
                rates={rates}
                colorMode={colorMode}
                actions="full"
                accountId={a.id}
                accounts={accounts}
                allHoldings={allHoldings}
                onDataChange={handleDataChange}
                onDelete={handleDeleteHolding}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">账户列表</h2>
        <div className="flex items-center gap-2">
          {priceMsg && <span className="text-xs text-muted-foreground">{priceMsg}</span>}
          <Button variant="outline" size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
            {fetchingPrices ? "更新中..." : "📡 更新股价"}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + 添加账户
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无账户，点击上方添加</p>
      ) : (
        <>
          {/* Desktop: table layout */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium w-8"></th>
                  <th className="text-left p-3 font-medium">账户</th>
                  <th className="text-right p-3 font-medium">总价值</th>
                  <th className="text-right p-3 font-medium">持仓盈亏</th>
                  <th className="text-right p-3 font-medium">现金</th>
                  <th className="text-right p-3 font-medium">持仓数</th>
                  <th className="text-center p-3 font-medium w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const sym = CURRENCY_SYMBOLS[a.currency];
                  const pnl = a.holdingsPnl;
                  const holdingsCost = a.holdingsValue - a.holdingsPnl;
                  const pnlPct = holdingsCost > 0 ? (pnl / holdingsCost) * 100 : null;
                  const hasPnl = a.holdingsCount > 0;
                  const isExpanded = expanded.has(a.id);

                  return (
                    <Fragment key={a.id}>
                      <tr
                        className="border-t cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleExpand(a.id)}
                      >
                        <td className="p-3 text-muted-foreground">{isExpanded ? "▼" : "▶"}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {a.currency}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {sym}
                          {formatAmount(a.accountValue)}
                        </td>
                        <td
                          className={`p-3 text-right ${hasPnl ? pnlColorClass(pnl, colorMode) : "text-muted-foreground"}`}
                        >
                          {hasPnl ? (
                            <>
                              {pnl > 0 ? "+" : ""}
                              {sym}
                              {formatAmount(pnl)}
                              {pnlPct !== null && (
                                <span className="text-xs ml-1">
                                  ({pnl > 0 ? "+" : ""}
                                  {formatPercent(pnlPct)}%)
                                </span>
                              )}
                            </>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {sym}
                          {formatAmount(a.cashBalance)}
                        </td>
                        <td className="p-3 text-right">{a.holdingsCount}</td>
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditAccount(a)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    将同时删除&ldquo;{a.name}
                                    &rdquo;下的所有持仓和交易记录，此操作不可撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAccount(a.id)}>
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${a.id}-detail`}>
                          <td colSpan={7}>{renderExpandedDetail(a)}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {accounts.map((a) => {
              const sym = CURRENCY_SYMBOLS[a.currency];
              const pnl = a.holdingsPnl;
              const holdingsCost = a.holdingsValue - a.holdingsPnl;
              const pnlPct = holdingsCost > 0 ? (pnl / holdingsCost) * 100 : null;
              const hasPnl = a.holdingsCount > 0;
              const isExpanded = expanded.has(a.id);

              return (
                <div key={a.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(a.id)}
                  >
                    {/* Header: name + currency + expand */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {a.currency}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <div onClick={(e) => e.stopPropagation()} className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditAccount(a)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  将同时删除&ldquo;{a.name}
                                  &rdquo;下的所有持仓和交易记录，此操作不可撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAccount(a.id)}>
                                  确认删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <span className="text-muted-foreground text-sm ml-1">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </div>
                    </div>
                    {/* Value row */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        {sym}
                        {formatAmount(a.accountValue)}
                      </span>
                      <span
                        className={`text-xs ${hasPnl ? pnlColorClass(pnl, colorMode) : "text-muted-foreground"}`}
                      >
                        {hasPnl ? (
                          <>
                            {pnl > 0 ? "+" : ""}
                            {sym}
                            {formatAmount(pnl)}
                            {pnlPct !== null && (
                              <span className="ml-1">
                                ({pnl > 0 ? "+" : ""}
                                {formatPercent(pnlPct)}%)
                              </span>
                            )}
                          </>
                        ) : (
                          "--"
                        )}
                      </span>
                    </div>
                    {/* Sub info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>
                        现金 {sym}
                        {formatAmount(a.cashBalance)}
                      </span>
                      <span>持仓 {a.holdingsCount} 个</span>
                    </div>
                  </div>
                  {isExpanded && <div className="border-t">{renderExpandedDetail(a)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <AccountForm open={createOpen} onOpenChange={setCreateOpen} onSaved={onRefresh} />
      {editAccount && (
        <AccountForm
          account={editAccount}
          open={!!editAccount}
          onOpenChange={(open) => !open && setEditAccount(null)}
          onSaved={() => {
            setEditAccount(null);
            handleDataChange();
          }}
        />
      )}
      {addHoldingFor && (
        <HoldingForm
          accountId={addHoldingFor.id}
          open={!!addHoldingFor}
          onOpenChange={(open) => !open && setAddHoldingFor(null)}
          onSaved={() => {
            setAddHoldingFor(null);
            handleDataChange();
          }}
        />
      )}
      {sortHoldingFor && (
        <HoldingSortDialog
          open={!!sortHoldingFor}
          onOpenChange={(open) => !open && setSortHoldingFor(null)}
          scope="account"
          accountId={sortHoldingFor.id}
          accountNameById={accountNameById}
          holdings={allHoldings.filter((h) => h.accountId === sortHoldingFor.id)}
          onSaved={() => {
            setSortHoldingFor(null);
            handleDataChange();
          }}
        />
      )}
    </div>
  );
}
