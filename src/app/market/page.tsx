"use client";

import { useState } from "react";
import { VixChartCard } from "@/components/vix-chart-card";
import { VixSentiment } from "@/components/vix-sentiment";
import { DataFreshness } from "@/components/data-freshness";
import { Button } from "@/components/ui/button";
import {
  MARKET_GROUPS,
  MARKET_INDEX_CONFIG,
  type MarketApiResponse,
  type MarketAthDrawdown,
  type MarketIndexSnapshot,
} from "@/lib/data-source/market-config";
import { useUserScopedQuery } from "@/lib/cache/hooks";
import { formatNumber } from "@/lib/utils/format";
import { ExternalLink, RefreshCw } from "lucide-react";

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: price >= 1000,
  });
}

function formatTimestamp(value: string): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const hasTime = !/T00:00:00(?:\.000)?$/.test(value);
    return parsed.toLocaleString("zh-CN", {
      year: hasTime ? undefined : "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: hasTime ? "2-digit" : undefined,
      minute: hasTime ? "2-digit" : undefined,
    });
  }

  return value.replaceAll("-", "/");
}

function formatAthDate(value: string | null): string {
  return value ? value.replaceAll("-", "/") : "--";
}

function formatDrawdown(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}%`;
}

function getRowTone(row: MarketIndexSnapshot | undefined): string {
  if (!row || row.price <= 0) return "text-muted-foreground";
  if (row.change > 0) return "text-red-400";
  if (row.change < 0) return "text-green-400";
  return "text-muted-foreground";
}

function getAthTone(item: MarketAthDrawdown): string {
  if (item.drawdownPercent == null) return "text-muted-foreground";
  if (item.drawdownPercent < 0) return "text-rose-600 dark:text-rose-400";
  if (item.drawdownPercent > 0) return "text-red-500";
  return "text-emerald-600 dark:text-emerald-400";
}

export default function MarketPage() {
  const marketQuery = useUserScopedQuery<MarketApiResponse>({
    name: "market",
    path: "/api/market",
  });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await marketQuery.refetch();
    setRefreshing(false);
  };

  const data = marketQuery.data;
  const loading = marketQuery.sessionStatus === "loading" || (marketQuery.isLoading && !data);
  const indexMap = new Map<string, MarketIndexSnapshot>(
    (data?.indices ?? []).map((item) => [item.id, item])
  );
  const athDrawdowns = data?.athDrawdowns ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 市场概览</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <DataFreshness updatedAt={marketQuery.dataUpdatedAt} isFetching={marketQuery.isFetching} />

      <section className="space-y-4">
        <VixChartCard vix={data?.vix} loading={loading} />
        <VixSentiment currentVix={data?.vix.latest} />

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">距历史最高点回撤</h2>
              <p className="text-xs text-muted-foreground">
                通过 Stooq 历史序列计算最近一次历史高点日期与当前回撤幅度。
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-[620px] w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-right font-medium">Last All Time High</th>
                  <th className="px-4 py-2 text-right font-medium">Change from All Time High</th>
                  <th className="w-12 px-4 py-2 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading && !data
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))
                  : athDrawdowns.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatAthDate(item.lastAllTimeHighDate)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${getAthTone(item)}`}>
                          {formatDrawdown(item.drawdownPercent)}
                        </td>
                        <td className="px-4 py-3 text-center text-lg">
                          {item.statusEmoji ?? (
                            <span className="text-sm text-muted-foreground">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {MARKET_GROUPS.map((group) => {
        const rows = MARKET_INDEX_CONFIG.filter((item) => item.group === group);

        return (
          <section key={group}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{group}</h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-[520px] w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">指数</th>
                    <th className="px-4 py-2 text-right font-medium">最新价</th>
                    <th className="px-4 py-2 text-right font-medium">涨跌</th>
                    <th className="px-4 py-2 text-right font-medium">涨跌幅</th>
                    <th className="px-4 py-2 text-right font-medium">更新时间</th>
                    <th className="w-10 px-4 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const live = indexMap.get(row.id);
                    const hasData = !!live && live.price > 0;
                    const tone = getRowTone(live);

                    return (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {loading && !data ? (
                            <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />
                          ) : hasData ? (
                            formatPrice(live.price)
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${tone}`}>
                          {loading && !data ? (
                            <span className="inline-block h-4 w-12 animate-pulse rounded bg-muted" />
                          ) : hasData ? (
                            `${live.change > 0 ? "+" : ""}${formatNumber(live.change, 2)}`
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${tone}`}>
                          {loading && !data ? (
                            <span className="inline-block h-4 w-12 animate-pulse rounded bg-muted" />
                          ) : hasData ? (
                            `${live.changePercent > 0 ? "+" : ""}${formatNumber(live.changePercent, 2)}%`
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {loading && !data ? (
                            <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />
                          ) : hasData ? (
                            formatTimestamp(live.updatedAt)
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <a
                            href={row.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            title="在数据源查看"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
