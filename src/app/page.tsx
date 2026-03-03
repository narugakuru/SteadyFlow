"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { DataFreshness } from "@/components/data-freshness";
import { DeviationChart } from "@/components/deviation-chart";
import { DisciplineTable } from "@/components/discipline-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import {
  PriceUpdateResult,
  PriceUpdateResultDialog,
} from "@/components/price-update-result-dialog";
import { RebalancePanel } from "@/components/rebalance-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useMutationJson, useUserScopedQuery } from "@/lib/cache/hooks";
import { formatAmount, formatRate } from "@/lib/utils/format";
import type { AllocationData } from "@/lib/utils/types";

export default function Dashboard() {
  const [priceResult, setPriceResult] = useState<PriceUpdateResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const netvalueTriggeredRef = useRef(false);

  const allocationQuery = useUserScopedQuery<AllocationData>({
    name: "asset-allocation",
    path: "/api/asset-allocation",
  });

  const priceMutation = useMutationJson<never, unknown>();

  const allocation = allocationQuery.data;
  const loading = allocationQuery.isLoading && !allocation;
  const fetchingPrices = priceMutation.isPending;
  const error = allocationQuery.error instanceof Error ? allocationQuery.error.message : "";

  useEffect(() => {
    if (!allocation || netvalueTriggeredRef.current) return;
    netvalueTriggeredRef.current = true;
    void fetch("/api/netvalue", { method: "POST" });
  }, [allocation]);

  const handleFetchPrices = async () => {
    try {
      const data = await priceMutation.mutateAsync({
        path: "/api/holdings/fetch-prices",
        method: "POST",
        mutationName: "fetch-prices-write",
      });

      const safeData = data as {
        updated?: PriceUpdateResult["updated"];
        failed?: PriceUpdateResult["failed"];
        skipped?: PriceUpdateResult["skipped"];
      };

      setPriceResult({
        updated: Array.isArray(safeData.updated) ? safeData.updated : [],
        failed: Array.isArray(safeData.failed) ? safeData.failed : [],
        skipped: Array.isArray(safeData.skipped) ? safeData.skipped : [],
      });
      setResultOpen(true);
      await allocationQuery.refetch();
    } catch {
      setPriceResult({
        updated: [],
        failed: [{ id: -1, name: "系统", ticker: "-", error: "更新股价失败，请稍后重试" }],
        skipped: [],
      });
      setResultOpen(true);
    }
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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">资产总览</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleFetchPrices}
            disabled={fetchingPrices}
            className="bg-black hover:bg-zinc-800 text-white font-semibold shadow-sm transition-all active:scale-95"
          >
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
          <CardTitle className="text-sm text-muted-foreground">总资产 (CNY)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">¥{formatAmount(allocation.totalAssetCny)}</p>
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
        </CardContent>
      </Card>

      <PortfolioChart allocation={allocation.allocation} />

      <div>
        <h2 className="text-lg font-semibold mb-3">资产配置纪律</h2>
        <DisciplineTable
          allocation={allocation.allocation}
          totalAssetCny={allocation.totalAssetCny}
          rates={rates}
          colorMode={allocation.settings.colorMode}
          onDataChange={() => void allocationQuery.refetch()}
        />
        <DeviationChart allocation={allocation.allocation} />
      </div>

      <RebalancePanel
        allocation={allocation.allocation}
        warningThreshold={allocation.settings.warningThreshold}
        colorMode={allocation.settings.colorMode}
      />

      <PriceUpdateResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={priceResult}
      />
    </div>
  );
}
