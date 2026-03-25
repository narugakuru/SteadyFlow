"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { DataFreshness } from "@/components/data-freshness";
import { DisciplineTable } from "@/components/discipline-table";
import { PageContainer } from "@/components/page-container";
import { PortfolioChart } from "@/components/portfolio-chart";
import {
  PriceUpdateResult,
  PriceUpdateResultDialog,
} from "@/components/price-update-result-dialog";
import { RebalancePanel } from "@/components/rebalance-panel";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  convertFromCny,
  getCurrencySymbol,
  getDisplayCurrencyLabel,
  getSummaryCurrency,
} from "@/lib/utils/display-currency";
import { shouldTriggerSilentQuoteRefresh } from "@/lib/utils/quote-sync";
import { formatAmount, formatRate } from "@/lib/utils/format";
import {
  pnlColorClass,
  type Account,
  type AllocationData,
  type CurrencyCode,
  type DisplayCurrencyMode,
  type Holding,
} from "@/lib/utils/types";

function formatRelativeTime(isoString: string) {
  const deltaMs = Math.max(0, Date.now() - Date.parse(isoString));
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}秒前`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getQuoteSyncHint(allocation: AllocationData) {
  if (allocation.quoteSync.isRunning) {
    return "股价更新：后台同步中...";
  }

  if (!allocation.quoteSync.lastSuccessAt) {
    return "股价更新：暂未成功同步";
  }

  return `股价更新：${formatRelativeTime(allocation.quoteSync.lastSuccessAt)}`;
}

export default function Dashboard() {
  const [priceResult, setPriceResult] = useState<PriceUpdateResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrencyMode>("default");
  const netvalueTriggeredRef = useRef(false);
  const silentQuoteTriggeredRef = useRef(false);

  const allocationQuery = useUserScopedQuery<AllocationData>({
    name: "asset-allocation",
    path: "/api/asset-allocation",
  });
  const accountsQuery = useUserScopedQuery<Account[]>({
    name: "accounts",
    path: "/api/accounts",
  });
  const holdingsQuery = useUserScopedQuery<Holding[]>({
    name: "holdings",
    path: "/api/holdings",
  });

  const priceMutation = useMutationJson<never, unknown>();

  const allocation = allocationQuery.data;
  const loading =
    allocationQuery.sessionStatus === "loading" || (allocationQuery.isLoading && !allocation);
  const fetchingPrices = priceMutation.isPending;
  const error = allocationQuery.error instanceof Error ? allocationQuery.error.message : "";
  const summaryCurrency = getSummaryCurrency(displayCurrency);

  useEffect(() => {
    if (!allocation || netvalueTriggeredRef.current) return;
    netvalueTriggeredRef.current = true;
    void fetch("/api/netvalue", { method: "POST" });
  }, [allocation]);

  useEffect(() => {
    if (!allocation || silentQuoteTriggeredRef.current || fetchingPrices) return;
    if (!shouldTriggerSilentQuoteRefresh(allocation.quoteSync)) return;

    silentQuoteTriggeredRef.current = true;
    void priceMutation
      .mutateAsync({
        path: "/api/holdings/fetch-prices?trigger=silent-client",
        method: "POST",
        mutationName: "fetch-prices-write",
      })
      .then(async () => {
        await allocationQuery.refetch();
      })
      .catch(() => undefined);
  }, [allocation, allocationQuery, fetchingPrices, priceMutation]);

  const runPriceSync = async (trigger: "manual" | "silent-client", showDialog: boolean) => {
    const data = await priceMutation.mutateAsync({
      path:
        trigger === "manual"
          ? "/api/holdings/fetch-prices"
          : "/api/holdings/fetch-prices?trigger=silent-client",
      method: "POST",
      mutationName: "fetch-prices-write",
    });

    const safeData = data as {
      updated?: PriceUpdateResult["updated"];
      failed?: PriceUpdateResult["failed"];
      skipped?: PriceUpdateResult["skipped"];
    };

    if (showDialog) {
      setPriceResult({
        updated: Array.isArray(safeData.updated) ? safeData.updated : [],
        failed: Array.isArray(safeData.failed) ? safeData.failed : [],
        skipped: Array.isArray(safeData.skipped) ? safeData.skipped : [],
      });
      setResultOpen(true);
    }

    await allocationQuery.refetch();
  };

  const handleFetchPrices = async () => {
    try {
      await runPriceSync("manual", true);
    } catch {
      setPriceResult({
        updated: [],
        failed: [{ id: -1, name: "系统", ticker: "-", error: "更新股价失败，请稍后重试" }],
        skipped: [],
      });
      setResultOpen(true);
    }
  };

  const handleDecisionExport = () => {
    window.location.assign("/api/export/portfolio?download=1&detail=decision");
  };

  const refreshDashboardContext = async () => {
    await Promise.all([
      allocationQuery.refetch(),
      accountsQuery.refetch(),
      holdingsQuery.refetch(),
    ]);
  };

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-[50vh]" />;
  }

  if (error || !allocation) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-destructive inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "加载失败"}
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={() => void allocationQuery.refetch()}>
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rates = allocation.rates.rates;
  const summarySymbol = getCurrencySymbol(summaryCurrency);
  const displayTotalAsset = convertFromCny(allocation.totalAssetCny, summaryCurrency, rates);
  const displayTotalPnl = convertFromCny(allocation.totalPnl, summaryCurrency, rates);
  const displayUnrealizedPnl = convertFromCny(allocation.unrealizedPnl, summaryCurrency, rates);
  const displayRealizedPnl = convertFromCny(allocation.realizedPnl, summaryCurrency, rates);
  const currencySet = new Set<CurrencyCode>();
  (accountsQuery.data ?? []).forEach((account) => currencySet.add(account.currency));
  if (currencySet.size === 0) {
    allocation.allocation.forEach((item) => {
      item.holdings.forEach((holding) => {
        const currency = holding.currency as CurrencyCode;
        if (currency === "CNY" || currency === "USD" || currency === "HKD") {
          currencySet.add(currency);
        }
      });
    });
  }
  const availableCurrencies = (["CNY", "USD", "HKD"] as CurrencyCode[]).filter((currency) =>
    currencySet.has(currency)
  );

  return (
    <PageContainer className="space-y-6 py-4 md:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">资产总览</h1>
        <div className="flex items-center gap-2">
          <Select
            value={displayCurrency}
            onValueChange={(value) => setDisplayCurrency(value as DisplayCurrencyMode)}
          >
            <SelectTrigger size="sm" className="w-[90px]">
              <SelectValue placeholder="货币" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">默认</SelectItem>
              {availableCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {getDisplayCurrencyLabel(currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
            {fetchingPrices ? (
              <span className="flex items-center gap-1">
                <LoadingSpinner className="w-3 h-3 text-white" /> 更新中...
              </span>
            ) : (
              "📡 更新股价"
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            总资产 ({summaryCurrency})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-3xl font-bold">
                {summarySymbol}
                {formatAmount(displayTotalAsset)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                汇率更新:{" "}
                {allocation.rates.updatedAt === "default"
                  ? "使用默认汇率"
                  : new Date(allocation.rates.updatedAt).toLocaleString()}
                {allocation.rates.source === "stale_cache" && " (缓存)"}
                {allocation.rates.source === "default" && " ⚠️"}
                {Object.entries(rates)
                  .map(([pair, rate]) => ` · ${pair}: ${formatRate(rate)}`)
                  .join("")}
              </p>
              <DataFreshness
                updatedAt={allocationQuery.dataUpdatedAt}
                isFetching={allocationQuery.isFetching}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {getQuoteSyncHint(allocation)}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-1 text-sm md:min-w-[220px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">账户总盈亏</span>
                <span className={pnlColorClass(displayTotalPnl, allocation.settings.colorMode)}>
                  {displayTotalPnl > 0 ? "+" : ""}
                  {summarySymbol}
                  {formatAmount(displayTotalPnl)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">持仓盈亏</span>
                <span
                  className={pnlColorClass(displayUnrealizedPnl, allocation.settings.colorMode)}
                >
                  {displayUnrealizedPnl > 0 ? "+" : ""}
                  {summarySymbol}
                  {formatAmount(displayUnrealizedPnl)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">了结盈亏</span>
                <span className={pnlColorClass(displayRealizedPnl, allocation.settings.colorMode)}>
                  {displayRealizedPnl > 0 ? "+" : ""}
                  {summarySymbol}
                  {formatAmount(displayRealizedPnl)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PortfolioChart
        allocation={allocation.allocation}
        rates={rates}
        displayCurrency={displayCurrency}
      />

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">资产配置纪律</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setTxOpen(true)}>
              交易
            </Button>
            <Button size="sm" onClick={handleDecisionExport}>
              导出持仓
            </Button>
          </div>
        </div>
        <DisciplineTable
          allocation={allocation.allocation}
          totalAssetCny={allocation.totalAssetCny}
          rates={rates}
          colorMode={allocation.settings.colorMode}
          displayCurrency={displayCurrency}
          onDataChange={() => void refreshDashboardContext()}
        />
        {/* <DeviationChart allocation={allocation.allocation} /> 暂时隐藏*/}
      </div>

      <RebalancePanel
        allocation={allocation.allocation}
        warningThreshold={allocation.settings.warningThreshold}
        colorMode={allocation.settings.colorMode}
        rates={rates}
        displayCurrency={displayCurrency}
      />

      <PriceUpdateResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={priceResult}
      />
      <TransactionForm
        open={txOpen}
        onOpenChange={setTxOpen}
        onSaved={() => void refreshDashboardContext()}
        accounts={accountsQuery.data ?? []}
        holdings={holdingsQuery.data ?? []}
        defaultType="buy"
      />
    </PageContainer>
  );
}
