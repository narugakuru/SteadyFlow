"use client";

import { useState } from "react";
import { useFetch } from "@/lib/hooks";
import { INDEX_CONFIG, type MarketIndex } from "@/lib/market-config";
import { VixSentiment } from "@/components/vix-sentiment";
import { TradingViewChart } from "@/components/tradingview-chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/format";

// --- 静态分组配置 ---

interface GroupConfig {
  label: string;
  symbols: string[];
}

const GROUP_CONFIG: GroupConfig[] = [
  { label: "🇺🇸 美股", symbols: ["^spx", "^ndq", "^dji"] },
  { label: "🇨🇳 A股", symbols: ["000300.SS", "000001.SS", "399006.SZ", "000905.SS"] },
  { label: "🇭🇰 港股", symbols: ["^hsi", "^HSTECH"] },
  { label: "🇯🇵 日股", symbols: ["^nkx", "东证指数"] },
  { label: "📉 波动", symbols: ["^vix"] },
];

// Tab 图表配置：每个 tab 的默认 symbol 和可切换列表
interface TabConfig {
  id: string;
  label: string;
  defaultSymbol: string;
  indices: { symbol: string; name: string }[];
}

const TAB_CONFIG: TabConfig[] = [
  {
    id: "cn",
    label: "A股",
    defaultSymbol: "SSE:000001",
    indices: [
      { symbol: "SSE:000001", name: "上证指数" },
      { symbol: "SSE:000300", name: "沪深300" },
      { symbol: "SZSE:399006", name: "创业板指" },
      { symbol: "SSE:000905", name: "中证500" },
    ],
  },
  {
    id: "us",
    label: "美股",
    defaultSymbol: "FOREXCOM:SPXUSD",
    indices: [
      { symbol: "FOREXCOM:SPXUSD", name: "S&P 500" },
      { symbol: "NASDAQ:NDX", name: "纳斯达克100" },
      { symbol: "DJ:DJI", name: "道琼斯" },
    ],
  },
  {
    id: "hk",
    label: "港股",
    defaultSymbol: "HSI:HSI",
    indices: [
      { symbol: "HSI:HSI", name: "恒生指数" },
      { symbol: "TVC:HSTECH", name: "恒生科技" },
    ],
  },
  {
    id: "jp",
    label: "日股",
    defaultSymbol: "TVC:NI225",
    indices: [
      { symbol: "TVC:NI225", name: "日经225" },
      { symbol: "TSE:TOPIX", name: "东证指数" },
    ],
  },
  {
    id: "vix",
    label: "波动率",
    defaultSymbol: "CBOE:VIX",
    indices: [{ symbol: "CBOE:VIX", name: "VIX" }],
  },
];

// --- 静态骨架行数据（从 INDEX_CONFIG 生成，不依赖 API） ---

interface StaticRow {
  symbol: string;
  name: string;
  tradingViewUrl: string;
  group: string;
}

const STATIC_ROWS: StaticRow[] = INDEX_CONFIG.map((c) => ({
  symbol: c.sourceSymbol ?? c.name,
  name: c.name,
  tradingViewUrl: `https://www.tradingview.com/chart/?symbol=${c.tradingView}`,
  group: c.group,
}));

// --- 工具函数 ---

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: price >= 1000,
  });
}

function formatTime(isoStr: string): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- 组件 ---

export default function MarketPage() {
  const { data, loading, refetch } = useFetch<MarketIndex[]>("/api/market");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("us");
  const [tabSymbols, setTabSymbols] = useState<Record<string, string>>(
    Object.fromEntries(TAB_CONFIG.map((t) => [t.id, t.defaultSymbol]))
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // 用 API 数据填充价格，按 symbol 匹配
  const priceMap = new Map<string, MarketIndex>();
  if (data) {
    for (const item of data) {
      priceMap.set(item.symbol, item);
    }
  }

  const vixData = priceMap.get("^vix");

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      {/* 标题 + 刷新 */}
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

      {/* 图表区域：按市场分 Tab（置顶，大图） */}
      <section>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 mb-3">
            <TabsList>
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 当前 Tab 的指数切换 */}
            {TAB_CONFIG.map((tab) =>
              tab.id === activeTab && tab.indices.length > 1 ? (
                <div key={tab.id} className="flex flex-wrap gap-1.5">
                  {tab.indices.map((idx) => (
                    <Button
                      key={idx.symbol}
                      variant={tabSymbols[tab.id] === idx.symbol ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTabSymbols((prev) => ({ ...prev, [tab.id]: idx.symbol }))}
                    >
                      {idx.name}
                    </Button>
                  ))}
                </div>
              ) : null
            )}
          </div>

          {TAB_CONFIG.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <TradingViewChart symbol={tabSymbols[tab.id]} />

              {/* 波动率 Tab 特殊：显示 VIX 情绪参考 */}
              {tab.id === "vix" && (
                <div className="mt-4">
                  <VixSentiment currentVix={vixData?.price || undefined} />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* 指数表格（静态骨架，始终显示） */}
      {GROUP_CONFIG.map((group) => {
        const rows = STATIC_ROWS.filter((r) => r.group === group.label);
        return (
          <section key={group.label}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">{group.label}</h2>
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
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
                  {rows.map((row) => {
                    const live = priceMap.get(row.symbol);
                    const hasData = live && live.price > 0;
                    const isUp = hasData && live.change > 0;
                    const isDown = hasData && live.change < 0;
                    const colorClass = isUp
                      ? "text-red-400"
                      : isDown
                        ? "text-green-400"
                        : "text-muted-foreground";

                    return (
                      <tr key={row.symbol} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">{row.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {loading && !data ? (
                            <span className="inline-block w-16 h-4 bg-muted animate-pulse rounded" />
                          ) : hasData ? (
                            formatPrice(live.price)
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${colorClass}`}>
                          {loading && !data ? (
                            <span className="inline-block w-12 h-4 bg-muted animate-pulse rounded" />
                          ) : hasData ? (
                            `${isUp ? "+" : ""}${formatNumber(live.change, 2)}`
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${colorClass}`}>
                          {loading && !data ? (
                            <span className="inline-block w-12 h-4 bg-muted animate-pulse rounded" />
                          ) : hasData ? (
                            `${isUp ? "+" : ""}${formatNumber(live.changePercent, 2)}%`
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {loading && !data ? (
                            <span className="inline-block w-20 h-4 bg-muted animate-pulse rounded" />
                          ) : hasData ? (
                            formatTime(live.updatedAt)
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <a
                            href={row.tradingViewUrl}
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
        );
      })}
    </div>
  );
}
