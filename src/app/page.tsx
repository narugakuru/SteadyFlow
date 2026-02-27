"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisciplineTable } from "@/components/discipline-table";
import { PortfolioChart } from "@/components/portfolio-chart";
import { DeviationChart } from "@/components/deviation-chart";
import { RebalancePanel } from "@/components/rebalance-panel";
import { AllocationData } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAmount, formatRate } from "@/lib/format";
import { AlertCircle } from "lucide-react";

function isAllocationData(value: unknown): value is AllocationData {
  if (!value || typeof value !== "object") return false;
  const v = value as AllocationData;
  return !!v.rates && !!v.rates.rates && Array.isArray(v.allocation) && !!v.settings;
}

export default function Dashboard() {
  const router = useRouter();
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [priceMsg, setPriceMsg] = useState("");
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const allocRes = await fetch("/api/asset-allocation");
      const allocData: unknown = await allocRes.json().catch(() => null);
      if (!allocRes.ok) {
        if (allocRes.status === 401) {
          router.replace("/login");
          return false;
        }
        const message =
          allocData && typeof allocData === "object" && "error" in allocData
            ? String(allocData.error)
            : "加载资产配置失败";
        throw new Error(message);
      }
      if (!isAllocationData(allocData)) {
        throw new Error("资产配置数据格式异常");
      }
      setAllocation(allocData);
      return true;
    } catch (err) {
      setAllocation(null);
      setError(err instanceof Error ? err.message : "加载资产配置失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Auto netvalue on load
  useEffect(() => {
    fetchAll().then((ok) => {
      if (ok) {
        fetch("/api/netvalue", { method: "POST" });
      }
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
            <Button variant="outline" size="sm" onClick={() => fetchAll()}>
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
        </CardContent>
      </Card>

      {/* Portfolio Chart */}
      <PortfolioChart allocation={allocation.allocation} />

      {/* Discipline Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">资产配置纪律</h2>
        <DisciplineTable
          allocation={allocation.allocation}
          totalAssetCny={allocation.totalAssetCny}
          rates={rates}
          colorMode={allocation.settings.colorMode}
          onDataChange={fetchAll}
        />
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
