"use client";

import { AlertCircle } from "lucide-react";

import { DataFreshness } from "@/components/data-freshness";
import { InsightsCompositionChart } from "@/components/insights-composition-chart";
import { InsightsHeatmap } from "@/components/insights-heatmap";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUserScopedQuery } from "@/lib/cache/hooks";
import type { PortfolioInsightsData } from "@/lib/utils/types";

export default function InsightsPage() {
  const insightsQuery = useUserScopedQuery<PortfolioInsightsData>({
    name: "insights",
    path: "/api/insights",
  });

  const loading =
    insightsQuery.sessionStatus === "loading" || (insightsQuery.isLoading && !insightsQuery.data);
  const error = insightsQuery.error instanceof Error ? insightsQuery.error.message : "";
  const insights = insightsQuery.data;

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-[60vh]" />;
  }

  if (error || !insights) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="space-y-3 text-center">
          <p className="inline-flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            {error || "洞察数据加载失败"}
          </p>
          <Button variant="outline" size="sm" onClick={() => void insightsQuery.refetch()}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer className="space-y-6 py-4 md:py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">洞察</h1>
          <p className="mt-1 text-sm text-muted-foreground">当前资产配置与持仓盈亏快照</p>
        </div>
        <DataFreshness
          updatedAt={insightsQuery.dataUpdatedAt}
          isFetching={insightsQuery.isFetching}
          className="text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightsCompositionChart title="货币占比" items={insights.currencyComposition} />
        <InsightsCompositionChart title="账户占比" items={insights.accountComposition} />
        <InsightsCompositionChart title="资产类别占比" items={insights.assetClassComposition} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">持仓热力图</h2>
            <p className="text-sm text-muted-foreground">
              面积代表当前市值，颜色代表当前持仓盈亏比例。
            </p>
          </div>
        </div>
        <InsightsHeatmap
          holdings={insights.heatmapHoldings}
          colorMode={insights.settings.colorMode}
        />
      </section>
    </PageContainer>
  );
}
