"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisciplineTable } from "@/components/discipline-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import { DeviationChart } from "@/components/deviation-chart";
import { RebalancePanel } from "@/components/rebalance-panel";
import { AllocationData } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAmount, formatRate } from "@/lib/format";

export default function Dashboard() {
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [priceMsg, setPriceMsg] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const allocRes = await fetch("/api/asset-allocation");
    const allocData = await allocRes.json();
    setAllocation(allocData);
    setLoading(false);
  }, []);

  // Auto netvalue on load
  useEffect(() => {
    fetchAll().then(() => {
      fetch("/api/netvalue", { method: "POST" });
    });
  }, [fetchAll]);

  const handleRefreshNetvalue = async () => {
    await fetch("/api/netvalue", { method: "POST" });
  };

  const handleFetchPrices = async () => {
    setFetchingPrices(true);
    setPriceMsg("");
    try {
      const res = await fetch("/api/holdings/fetch-prices", { method: "POST" });
      const data = await res.json();
      const parts: string[] = [];
      if (data.updated?.length) parts.push(`更新 ${data.updated.length} 个`);
      if (data.failed?.length) parts.push(`失败 ${data.failed.length} 个`);
      if (data.skipped?.length) parts.push(`跳过 ${data.skipped.length} 个`);
      setPriceMsg(parts.length > 0 ? parts.join("，") : "没有可自动更新的持仓");
      await fetchAll();
    } catch {
      setPriceMsg("更新股价失败");
    }
    setFetchingPrices(false);
    setTimeout(() => setPriceMsg(""), 5000);
  };

  if (loading || !allocation) {
    return <LoadingSpinner text="加载中..." className="min-h-[50vh]" />;
  }

  const rates = allocation.rates.rates;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">资产总览</h1>
        <div className="flex items-center gap-2">
          {priceMsg && <span className="text-xs text-muted-foreground">{priceMsg}</span>}
          <Button variant="outline" size="sm" onClick={handleFetchPrices} disabled={fetchingPrices}>
            {fetchingPrices ? "更新中..." : "📡 更新股价"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshNetvalue}>
            📸 记录净值
          </Button>
        </div>
      </div>

      {/* Total Asset Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">总资产 (CNY)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">¥{formatAmount(allocation.totalAssetCny)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            汇率更新: {allocation.rates.updatedAt === "default" ? "使用默认汇率" : new Date(allocation.rates.updatedAt).toLocaleString()}
            {allocation.rates.source === "stale_cache" && " (缓存)"}
            {allocation.rates.source === "default" && " ⚠️"}
            {Object.entries(rates).map(([pair, rate]) => ` · ${pair}: ${formatRate(rate)}`).join("")}
          </p>
        </CardContent>
      </Card>

      {/* Portfolio Chart */}
      <PortfolioChart allocation={allocation.allocation} />

      {/* Discipline Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">资产配置纪律</h2>
        <DisciplineTable allocation={allocation.allocation} totalAssetCny={allocation.totalAssetCny} rates={rates} colorMode={allocation.settings.colorMode} onDataChange={fetchAll} />
        <DeviationChart allocation={allocation.allocation} />
      </div>

      {/* Rebalance Suggestions */}
      <RebalancePanel
        allocation={allocation.allocation}
        warningThreshold={allocation.settings.warningThreshold}
        colorMode={allocation.settings.colorMode}
      />
    </div>
  );
}
