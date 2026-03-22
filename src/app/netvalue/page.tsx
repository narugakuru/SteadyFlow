"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { DataFreshness } from "@/components/data-freshness";
import { NetvalueCharts } from "@/components/netvalue-charts";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUserScopedQuery } from "@/lib/cache/hooks";
import {
  DEFAULT_NETVALUE_PAGE_SIZE,
  getNetvalueChartGrain,
  NETVALUE_CHART_RANGE_ORDER,
} from "@/lib/services/netvalue-history-helpers";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import type {
  NetvalueChartRange,
  NetvalueChartResponse,
  NetvalueListResponse,
} from "@/lib/utils/types";

function formatFixed2(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NetvaluePage() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<NetvalueChartRange>("90d");
  const chartGrain = getNetvalueChartGrain(range);

  const listQuery = useUserScopedQuery<NetvalueListResponse>({
    name: "netvalue-list",
    path: `/api/netvalue/list?page=${page}&pageSize=${DEFAULT_NETVALUE_PAGE_SIZE}`,
    params: {
      page,
      pageSize: DEFAULT_NETVALUE_PAGE_SIZE,
    },
  });

  const chartQuery = useUserScopedQuery<NetvalueChartResponse>({
    name: "netvalue-chart",
    path: `/api/netvalue/chart?range=${range}`,
    params: {
      range,
      grain: chartGrain,
    },
  });

  const loading =
    listQuery.sessionStatus === "loading" ||
    (listQuery.isLoading && !listQuery.data && chartQuery.isLoading && !chartQuery.data);

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-screen" />;
  }

  const records = listQuery.data?.records ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_NETVALUE_PAGE_SIZE));
  const listError = listQuery.error instanceof Error ? listQuery.error.message : "";
  const chartError = chartQuery.error instanceof Error ? chartQuery.error.message : "";
  const chart = chartQuery.data;
  const hasChartData = (chart?.points.length ?? 0) >= 2;
  const hasListData = records.length > 0;
  const pageLabel = `第 ${page} 页 / 共 ${totalPages} 页`;

  return (
    <PageContainer className="space-y-6 py-4 md:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">📸 净值历史</h1>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {NETVALUE_CHART_RANGE_ORDER.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === range ? "default" : "outline"}
                onClick={() => setRange(option)}
                disabled={chartQuery.isFetching && option === range}
              >
                {option}
              </Button>
            ))}
          </div>
          <DataFreshness updatedAt={chartQuery.dataUpdatedAt} isFetching={chartQuery.isFetching} />
        </div>

        {chartQuery.isLoading && !chart ? (
          <LoadingSpinner text="图表加载中..." className="min-h-[240px]" />
        ) : chartError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="inline-flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {chartError || "图表加载失败"}
            </p>
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => void chartQuery.refetch()}>
                重试图表
              </Button>
            </div>
          </div>
        ) : hasChartData && chart ? (
          <NetvalueCharts chart={chart} />
        ) : (
          <p className="text-muted-foreground text-center py-8">暂无足够的图表数据</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">历史净值清单</h2>
          <DataFreshness updatedAt={listQuery.dataUpdatedAt} isFetching={listQuery.isFetching} />
        </div>

        {listQuery.isLoading && !listQuery.data ? (
          <LoadingSpinner text="列表加载中..." className="min-h-[240px]" />
        ) : listError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <p className="inline-flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {listError || "列表加载失败"}
            </p>
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
                重试列表
              </Button>
            </div>
          </div>
        ) : hasListData ? (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">日期</th>
                    <th className="text-right p-3 font-medium">总资产 (¥)</th>
                    <th className="text-right p-3 font-medium">股票</th>
                    <th className="text-right p-3 font-medium">黄金</th>
                    <th className="text-right p-3 font-medium">债券</th>
                    <th className="text-right p-3 font-medium">现金</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const alloc = record.dataJson.allocation;
                    const getAllocationCell = (name: string) => {
                      const item = alloc.find((a) => normalizeAssetClassName(a.name) === name);
                      if (!item) return "-";
                      return (
                        <div className="leading-tight">
                          <div>¥{formatFixed2(item.actualValue)}</div>
                          <div>{formatFixed2(item.actualPct)}%</div>
                        </div>
                      );
                    };

                    return (
                      <tr key={record.id} className="border-t">
                        <td className="p-3">{record.date}</td>
                        <td className="p-3 text-right font-medium">
                          ¥{formatFixed2(record.totalAssetCny)}
                        </td>
                        <td className="p-3 text-right">{getAllocationCell("股票")}</td>
                        <td className="p-3 text-right">{getAllocationCell("黄金")}</td>
                        <td className="p-3 text-right">{getAllocationCell("债券")}</td>
                        <td className="p-3 text-right">{getAllocationCell("现金")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                共 {total} 条记录，{pageLabel}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || listQuery.isFetching}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!listQuery.data?.hasMore || listQuery.isFetching}
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8">暂无净值记录</p>
        )}
      </section>
    </PageContainer>
  );
}
