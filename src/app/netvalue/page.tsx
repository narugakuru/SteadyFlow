"use client";

import { DataFreshness } from "@/components/data-freshness";
import { NetvalueCharts } from "@/components/netvalue-charts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUserScopedQuery } from "@/lib/cache/hooks";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import type { NetvalueRecord } from "@/lib/utils/types";

function formatFixed2(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NetvaluePage() {
  const recordsQuery = useUserScopedQuery<NetvalueRecord[]>({
    name: "netvalue",
    path: "/api/netvalue",
  });

  const records = recordsQuery.data;
  const loading = recordsQuery.isLoading && !records;

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-screen" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">📸 净值历史</h1>
      </div>

      <DataFreshness updatedAt={recordsQuery.dataUpdatedAt} isFetching={recordsQuery.isFetching} />

      {!records || records.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无净值记录</p>
      ) : (
        <>
          <NetvalueCharts records={records} />
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
        </>
      )}
    </div>
  );
}
