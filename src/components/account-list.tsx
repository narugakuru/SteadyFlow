"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Account,
  Holding,
  AssetClass,
  CURRENCY_SYMBOLS,
  pnlColorClass,
  type CurrencyCode,
  type DisplayCurrencyMode,
} from "@/lib/utils/types";
import { AccountHoldingTable } from "@/components/account-holding-table";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { calculateCumulativePnl, calculateCumulativePnlPct } from "@/lib/utils/account-principal";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";
import { entityOptimisticUpdate } from "@/lib/cache/optimistic";
import { useDisplayCurrencyPreference } from "@/lib/services/display-currency-preference";
import { convertCurrency, getCurrencySymbol } from "@/lib/utils/display-currency";

// ─── Account Form (create/edit) ───

function compareAccountsByDefaultOrder(left: Account, right: Account) {
  return left.sortOrder - right.sortOrder || left.id - right.id;
}

function convertAccountAmount(
  amount: number,
  sourceCurrency: CurrencyCode,
  displayCurrency: DisplayCurrencyMode,
  rates: Record<string, number>
) {
  if (displayCurrency === "default") {
    return amount;
  }

  return convertCurrency(amount, sourceCurrency, displayCurrency, rates);
}

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
  const [principal, setPrincipal] = useState(account?.principal?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!account;
  const mutation = useMutationJson<
    { name: string; currency: string; cashBalance: number; principal: number },
    Account
  >();

  const handleSubmit = async () => {
    setSaving(true);
    const url = isEdit ? `/api/accounts/${account.id}` : "/api/accounts";
    await mutation.mutateAsync({
      path: url,
      method: isEdit ? "PUT" : "POST",
      mutationName: "accounts-write",
      optimistic: entityOptimisticUpdate,
      body: {
        name,
        currency,
        cashBalance: parseFloat(cashBalance) || 0,
        principal: parseFloat(principal || cashBalance) || 0,
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
          <div>
            <Label>原始资金 ({CURRENCY_SYMBOLS[currency]})</Label>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
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
      optimistic: entityOptimisticUpdate,
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
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  defaultExpandId?: number;
  onRefresh: () => void;
}

export function AccountList({
  accounts,
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
  const [showZeroMarketHoldings, setShowZeroMarketHoldings] = useState(false);
  const [priceMsg, setPriceMsg] = useState("");
  const [displayCurrency] = useDisplayCurrencyPreference();
  const holdingsPath = showZeroMarketHoldings
    ? "/api/holdings?includeZeroMarketValue=1"
    : "/api/holdings?includeZeroMarketValue=0";
  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: holdingsPath,
    params: {
      includeZeroMarketValue: showZeroMarketHoldings ? 1 : 0,
    },
  });
  const mutation = useMutationJson<unknown, unknown>();
  const allHoldings = holdingsQuery.data ?? [];
  const fetchingPrices = mutation.isPending;
  const displayedAccounts = useMemo(() => {
    return [...accounts].sort((left, right) => {
      const leftValue = convertAccountAmount(
        left.accountValue,
        left.currency,
        displayCurrency,
        rates
      );
      const rightValue = convertAccountAmount(
        right.accountValue,
        right.currency,
        displayCurrency,
        rates
      );
      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }

      return compareAccountsByDefaultOrder(left, right);
    });
  }, [accounts, displayCurrency, rates]);

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

  const handleDataChange = () => {
    void holdingsQuery.refetch();
    onRefresh();
  };

  // Shared expanded detail content
  const renderExpandedDetail = (a: Account) => {
    const amountCurrency = displayCurrency === "default" ? a.currency : displayCurrency;
    const sym = getCurrencySymbol(amountCurrency);
    const accountHoldings = allHoldings
      .filter((h) => h.accountId === a.id)
      .sort((x, y) => x.accountSortOrder - y.accountSortOrder || x.id - y.id);
    const holdingsTotal = accountHoldings.reduce((s, h) => s + h.marketValue, 0);
    const displayAccountValue = convertAccountAmount(
      a.accountValue,
      a.currency,
      displayCurrency,
      rates
    );
    const displayHoldingsTotal = convertAccountAmount(
      holdingsTotal,
      a.currency,
      displayCurrency,
      rates
    );
    const displayCashBalance = convertAccountAmount(
      a.cashBalance,
      a.currency,
      displayCurrency,
      rates
    );
    const cumulativePnlRaw = calculateCumulativePnl(a.accountValue, a.principal);
    const displayCumulativePnl = convertAccountAmount(
      cumulativePnlRaw,
      a.currency,
      displayCurrency,
      rates
    );
    const cumulativePnlPct = calculateCumulativePnlPct(cumulativePnlRaw, a.principal);

    return (
      <div className="bg-muted/20">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm md:gap-6">
          <span>
            总价值{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(displayAccountValue)}
            </span>
          </span>
          <span>
            持仓{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(displayHoldingsTotal)}
            </span>
          </span>
          <span>
            现金{" "}
            <span className="font-semibold">
              {sym}
              {formatAmount(displayCashBalance)}
            </span>
          </span>
          <span>
            累计盈亏{" "}
            <span className={`font-semibold ${pnlColorClass(displayCumulativePnl, colorMode)}`}>
              {displayCumulativePnl > 0 ? "+" : ""}
              {sym}
              {formatAmount(displayCumulativePnl)}
              <span className="ml-1">
                {cumulativePnlPct === null
                  ? "--"
                  : `${cumulativePnlPct > 0 ? "+" : ""}${formatPercent(cumulativePnlPct)}%`}
              </span>
            </span>
          </span>
          <div className="flex-1 hidden md:block" />
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={() => setAddHoldingFor(a)}>
              + 新建持仓
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditAccount(a)}>
              编辑账户
            </Button>
          </div>
        </div>
        <AccountHoldingTable
          account={a}
          holdings={accountHoldings}
          rates={rates}
          displayCurrency={displayCurrency}
          colorMode={colorMode}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">账户列表</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {priceMsg && <span className="text-xs text-muted-foreground">{priceMsg}</span>}
          <label className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
            <span>显示未持仓标的</span>
            <Switch
              size="sm"
              checked={showZeroMarketHoldings}
              onCheckedChange={setShowZeroMarketHoldings}
              aria-label="显示未持仓标的"
            />
          </label>
          <Button size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
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
        <div className="space-y-3">
          {displayedAccounts.map((a) => {
            const amountCurrency = displayCurrency === "default" ? a.currency : displayCurrency;
            const sym = getCurrencySymbol(amountCurrency);
            const rawPnl = a.holdingsPnl;
            const pnl = convertAccountAmount(rawPnl, a.currency, displayCurrency, rates);
            const holdingsCost = a.holdingsValue - rawPnl;
            const pnlPct = holdingsCost > 0 ? (rawPnl / holdingsCost) * 100 : null;
            const hasPnl = a.holdingsCount > 0;
            const isExpanded = expanded.has(a.id);
            const displayAccountValue = convertAccountAmount(
              a.accountValue,
              a.currency,
              displayCurrency,
              rates
            );

            return (
              <div key={a.id} className="overflow-hidden rounded-lg border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/40"
                  onClick={() => toggleExpand(a.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{a.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{a.currency}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div>
                      <div className="text-lg font-semibold tabular-nums">
                        {sym}
                        {formatAmount(displayAccountValue)}
                      </div>
                      <div
                        className={`mt-1 text-sm tabular-nums ${hasPnl ? pnlColorClass(pnl, colorMode) : "text-muted-foreground"}`}
                      >
                        {hasPnl ? (
                          <>
                            {pnl > 0 ? "+" : ""}
                            {sym}
                            {formatAmount(pnl)}
                            {pnlPct !== null ? (
                              <span className="ml-2">
                                {pnlPct > 0 ? "+" : ""}
                                {formatPercent(pnlPct)}%
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "--"
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`size-5 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>
                {isExpanded ? <div className="border-t">{renderExpandedDetail(a)}</div> : null}
              </div>
            );
          })}
        </div>
      )}

      <AccountForm
        key={`create-account-${createOpen}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={onRefresh}
      />
      {editAccount && (
        <AccountForm
          key={`edit-account-${editAccount.id}`}
          account={editAccount}
          open={!!editAccount}
          onOpenChange={(open) => !open && setEditAccount(null)}
          onSaved={() => {
            setEditAccount(null);
            onRefresh();
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
    </div>
  );
}
