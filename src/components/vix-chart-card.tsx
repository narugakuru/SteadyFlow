"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";

interface MarketVixData {
  latest: number | null;
  latestAt: string | null;
  series: Array<{
    date: string;
    close: number;
  }>;
}

interface VixChartCardProps {
  vix: MarketVixData | undefined;
  loading: boolean;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return value.slice(5, 10);
}

export function VixChartCard({ vix, loading }: VixChartCardProps) {
  if (loading && !vix) {
    return (
      <Card>
        <CardHeader className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const series = vix?.series ?? [];
  const latest = vix?.latest;
  const latestAt = vix?.latestAt;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>VIX 波动率</CardTitle>
            <Badge variant="outline">CBOE Daily</Badge>
          </div>
          <CardDescription>用最新可用日线收盘值观察市场风险偏好变化。</CardDescription>
        </div>
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <div className="text-xs text-muted-foreground">最新收盘</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {typeof latest === "number" ? latest.toFixed(2) : "--"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            更新到 {latestAt ? latestAt.slice(0, 10) : "-"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="vixArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                minTickGap={28}
                tickFormatter={formatDateLabel}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                width={36}
                tickFormatter={(value) => formatNumber(Number(value), 0)}
              />
              <Tooltip
                formatter={(value) => [formatNumber(Number(value ?? 0), 2), "VIX"]}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#vixArea)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            暂无可用 VIX 数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
