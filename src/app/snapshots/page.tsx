"use client";

import { useFetch } from "@/lib/hooks";
import { Snapshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SnapshotsPage() {
  const { data: snapshots, loading } = useFetch<Snapshot[]>("/api/snapshots");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📸 快照历史</h1>
        <Link href="/">
          <Button variant="outline" size="sm">← 返回 Dashboard</Button>
        </Link>
      </div>

      {!snapshots || snapshots.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无快照记录</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">日期</th>
                <th className="text-right p-3 font-medium">总资产 (¥)</th>
                <th className="text-right p-3 font-medium">股票基金</th>
                <th className="text-right p-3 font-medium">黄金</th>
                <th className="text-right p-3 font-medium">债券</th>
                <th className="text-right p-3 font-medium">现金</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => {
                const alloc = s.dataJson.allocation;
                const getPct = (name: string) => {
                  const item = alloc.find((a) => a.name === name);
                  return item ? `${item.actualPct}%` : "-";
                };
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.date}</td>
                    <td className="p-3 text-right font-medium">¥{s.totalAssetCny.toLocaleString()}</td>
                    <td className="p-3 text-right">{getPct("股票基金")}</td>
                    <td className="p-3 text-right">{getPct("黄金")}</td>
                    <td className="p-3 text-right">{getPct("债券")}</td>
                    <td className="p-3 text-right">{getPct("现金")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
