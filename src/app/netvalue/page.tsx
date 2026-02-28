"use client";

import { useFetch } from "@/lib/hooks";
import { NetvalueRecord } from "@/lib/types";
import { normalizeAssetClassName } from "@/lib/asset-class";
import { NetvalueCharts } from "@/components/netvalue-charts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatAmount } from "@/lib/format";

export default function NetvaluePage() {
  const { data: records, loading } = useFetch<NetvalueRecord[]>("/api/netvalue");

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-screen" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">📸 净值历史</h1>
      </div>

      {!records || records.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无净值记录</p>
      ) : (
        <>
          <NetvalueCharts records={records} />
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
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
                {records.map((s) => {
                  const alloc = s.dataJson.allocation;
                  const getPct = (name: string) => {
                    const item = alloc.find((a) => normalizeAssetClassName(a.name) === name);
                    return item ? `${item.actualPct}%` : "-";
                  };
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">{s.date}</td>
                      <td className="p-3 text-right font-medium">
                        ¥{formatAmount(s.totalAssetCny)}
                      </td>
                      <td className="p-3 text-right">{getPct("股票")}</td>
                      <td className="p-3 text-right">{getPct("黄金")}</td>
                      <td className="p-3 text-right">{getPct("债券")}</td>
                      <td className="p-3 text-right">{getPct("现金")}</td>
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
