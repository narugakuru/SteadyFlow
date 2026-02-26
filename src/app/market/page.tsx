"use client";

import { useState } from "react";
import { useFetch } from "@/lib/hooks";
import { VixSentiment } from "@/components/vix-sentiment";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import type { MarketIndex } from "@/lib/market-data";

interface IndexGroup {
  label: string;
  items: MarketIndex[];
}

function groupIndices(data: MarketIndex[]): IndexGroup[] {
  const groupConfig = [
    { label: "🇺🇸 美股", symbols: ["^GSPC", "^NDX", "^DJI"] },
    { label: "🇨🇳 A股", symbols: ["000300.SS", "000001.SS", "399006.SZ", "000905.SS"] },
    { label: "🇭🇰 港股", symbols: ["^HSI", "^HSTECH"] },
    { label: "🇯🇵 日股", symbols: ["^N225", "^TOPX"] },
    { label: "📉 波动", symbols: ["^VIX"] },
  ];

  const dataMap = new Map(data.map((d) => [d.symbol, d]));

  return groupConfig.map((g) => ({
    label: g.label,
    items: g.symbols.map((s) => dataMap.get(s)).filter(Boolean) as MarketIndex[],
  }));
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
}

function formatTime(isoStr: string): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function MarketPage() {
  const { data, loading, refetch } = useFetch<MarketIndex[]>("/api/market");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const groups = data ? groupIndices(data) : [];
  const vix = data?.find((d) => d.symbol === "^VIX");

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📊 市场概览</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : data && data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          无法获取市场数据，请检查网络连接后重试
        </div>
      ) : (
        <>
          {groups
            .filter((g) => g.label !== "📉 波动")
            .map((group) => (
              <section key={group.label}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  {group.label}
                </h2>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">指数</th>
                        <th className="text-right px-4 py-2 font-medium">最新价</th>
                        <th className="text-right px-4 py-2 font-medium">涨跌</th>
                        <th className="text-right px-4 py-2 font-medium">涨跌幅</th>
                        <th className="text-right px-4 py-2 font-medium">更新时间</th>
                        <th className="text-right px-4 py-2 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const isUp = item.change > 0;
                        const isDown = item.change < 0;
                        const colorClass = isUp
                          ? "text-red-400"
                          : isDown
                            ? "text-green-400"
                            : "text-muted-foreground";

                        return (
                          <tr key={item.symbol} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium">{item.name}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {item.price ? formatPrice(item.price) : "-"}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums ${colorClass}`}>
                              {item.price ? `${isUp ? "+" : ""}${item.change.toFixed(2)}` : "-"}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums ${colorClass}`}>
                              {item.price ? `${isUp ? "+" : ""}${item.changePercent.toFixed(2)}%` : "-"}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {formatTime(item.updatedAt)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <a
                                href={item.tradingViewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="在 TradingView 查看"
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
            ))}

          {/* VIX 区域 */}
          {vix && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  📉 恐慌与波动 (VIX)
                </h2>
                <a
                  href={vix.tradingViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  TradingView <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* VIX 当前值 */}
              <div className="rounded-lg border p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-3xl font-bold tabular-nums">
                      {vix.price ? vix.price.toFixed(2) : "-"}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`text-lg tabular-nums ${
                        vix.change > 0
                          ? "text-red-400"
                          : vix.change < 0
                            ? "text-green-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {vix.price
                        ? `${vix.change > 0 ? "+" : ""}${vix.change.toFixed(2)} (${vix.change > 0 ? "+" : ""}${vix.changePercent.toFixed(2)}%)`
                        : ""}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(vix.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 情绪阈值参考 */}
              <VixSentiment currentVix={vix.price || undefined} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
