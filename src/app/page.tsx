"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { DisciplineTable } from "@/components/discipline-table";
import { OverviewAssetTrend } from "@/components/overview-asset-trend";
import { PageContainer } from "@/components/page-container";
import {
  PriceUpdateResult,
  PriceUpdateResultDialog,
} from "@/components/price-update-result-dialog";
import { RebalancePanel } from "@/components/rebalance-panel";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";
import { useDashboardTrendRangePreference } from "@/lib/services/dashboard-trend-range-preference";
import { useDisplayCurrencyPreference } from "@/lib/services/display-currency-preference";
import { getNetvalueChartGrain } from "@/lib/services/netvalue-history-helpers";
import {
  convertFromCny,
  getCurrencySymbol,
  getSummaryCurrency,
} from "@/lib/utils/display-currency";
import { shouldTriggerSilentQuoteRefresh } from "@/lib/utils/quote-sync";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import {
  pnlColorClass,
  type Account,
  type AllocationData,
  type DisplayCurrencyMode,
  type Holding,
  type NetvalueChartResponse,
  type NetvaluePerformanceResponse,
} from "@/lib/utils/types";

function DashboardSkeleton() {
  return (
    <PageContainer className="space-y-6 py-4 md:py-6">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="min-h-[420px] p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-12 w-56 md:h-14 md:w-72" />
              <Skeleton className="h-5 w-44" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <Skeleton className="mt-16 h-56 w-full rounded-lg" />
        </div>
        <div className="flex justify-center gap-2 border-t border-border px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-7 w-12" />
          ))}
        </div>
      </section>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </PageContainer>
  );
}

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
  const [displayCurrency, setDisplayCurrency] = useDisplayCurrencyPreference();
  const [trendRange, setTrendRange] = useDashboardTrendRangePreference();
  const [trendView, setTrendView] = useState<"netvalue" | "performance">("netvalue");
  const netvalueTriggeredRef = useRef(false);
  const silentQuoteTriggeredRef = useRef(false);
  const trendGrain = getNetvalueChartGrain(trendRange);

  const allocationQuery = useUserScopedQuery<AllocationData>({
    name: "asset-allocation",
    path: "/api/asset-allocation",
  });
  const trendQuery = useUserScopedQuery<NetvalueChartResponse>({
    name: "netvalue-chart",
    path: `/api/netvalue/chart?range=${trendRange}`,
    params: {
      range: trendRange,
      grain: trendGrain,
    },
  });
  const performanceQuery = useUserScopedQuery<NetvaluePerformanceResponse>({
    name: "netvalue-performance",
    path: `/api/netvalue/performance?range=${trendRange}&grain=${trendGrain}`,
    params: {
      range: trendRange,
      grain: trendGrain,
    },
    enabled: trendView === "performance",
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
      trendQuery.refetch(),
      performanceQuery.refetch(),
      accountsQuery.refetch(),
      holdingsQuery.refetch(),
    ]);
  };

  if (loading) {
    return <DashboardSkeleton />;
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
  const estimatedPrincipalCny = allocation.totalAssetCny - allocation.totalPnl;
  const totalPnlPct =
    Number.isFinite(estimatedPrincipalCny) && estimatedPrincipalCny > 0
      ? (allocation.totalPnl / estimatedPrincipalCny) * 100
      : null;
  const trendError = trendQuery.error instanceof Error ? trendQuery.error.message : "";
  const performanceError =
    performanceQuery.error instanceof Error ? performanceQuery.error.message : "";
  const activeTrendQuery = trendView === "performance" ? performanceQuery : trendQuery;
  const activeTrendError = trendView === "performance" ? performanceError : trendError;
  const totalPnlPrefix = displayTotalPnl > 0 ? "+" : "";
  const totalPnlPctLabel =
    totalPnlPct === null ? "--" : `${totalPnlPct > 0 ? "+" : ""}${formatPercent(totalPnlPct)}%`;

  return (
    <PageContainer className="space-y-6 py-4 md:py-6">
      <OverviewAssetTrend
        chart={trendQuery.data}
        performance={performanceQuery.data}
        loading={activeTrendQuery.isLoading}
        error={activeTrendError}
        range={trendRange}
        onRangeChange={setTrendRange}
        view={trendView}
        onViewChange={setTrendView}
        onRetry={() => void activeTrendQuery.refetch()}
        totalLabel={`${summarySymbol}${formatAmount(displayTotalAsset)}`}
        pnlLabel={`${totalPnlPrefix}${summarySymbol}${formatAmount(displayTotalPnl)}`}
        pnlPctLabel={totalPnlPctLabel}
        pnlClassName={pnlColorClass(displayTotalPnl, allocation.settings.colorMode)}
        updatedAt={activeTrendQuery.dataUpdatedAt}
        isFetching={activeTrendQuery.isFetching}
        actions={
          <>
            <Select
              value={displayCurrency}
              onValueChange={(value) => setDisplayCurrency(value as DisplayCurrencyMode)}
            >
              <SelectTrigger size="sm" className="w-[92px]">
                <SelectValue placeholder="货币" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="HKD">HKD</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
              {fetchingPrices ? (
                <span className="flex items-center gap-1">
                  <LoadingSpinner className="w-3 h-3 text-primary-foreground" /> 更新中...
                </span>
              ) : (
                "更新股价"
              )}
            </Button>
          </>
        }
      />
      <p className="text-xs text-muted-foreground">{getQuoteSyncHint(allocation)}</p>

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
