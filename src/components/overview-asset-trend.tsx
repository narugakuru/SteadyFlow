"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DataFreshness } from "@/components/data-freshness";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NETVALUE_CHART_RANGE_ORDER } from "@/lib/services/netvalue-history-helpers";
import { formatAmount, formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/utils";
import { OVERVIEW_ASSET_COLORS } from "@/lib/visualization/theme-colors";
import type {
  NetvalueChartRange,
  NetvalueChartResponse,
  NetvaluePerformanceResponse,
} from "@/lib/utils/types";

const RANGE_LABELS: Record<NetvalueChartRange, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  "1y": "1Y",
  "3y": "3Y",
  all: "ALL",
};

interface OverviewAssetTrendProps {
  chart?: NetvalueChartResponse;
  performance?: NetvaluePerformanceResponse;
  loading?: boolean;
  error?: string;
  range: NetvalueChartRange;
  onRangeChange: (range: NetvalueChartRange) => void;
  view: "netvalue" | "performance";
  onViewChange: (view: "netvalue" | "performance") => void;
  onRetry: () => void;
  totalLabel: string;
  pnlLabel: string;
  pnlPctLabel: string;
  pnlClassName: string;
  actions?: React.ReactNode;
  updatedAt?: number;
  isFetching?: boolean;
}

interface ChartTooltipPayload {
  value?: number | string;
  payload?: {
    cumulativeTwr?: number;
    value?: number;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
}

function AssetTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">¥{formatAmount(value)}</p>
    </div>
  );
}

function formatTwrPercent(value: number) {
  const percent = Number.isFinite(value) ? value * 100 : 0;
  return `${percent > 0 ? "+" : ""}${formatPercent(percent)}%`;
}

function PerformanceTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">
        累计 TWR {formatTwrPercent(Number(point?.cumulativeTwr ?? 0))}
      </p>
      <p className="mt-1 text-muted-foreground">
        组合市值 ¥{formatAmount(Number(point?.value ?? 0))}
      </p>
    </div>
  );
}

export function OverviewAssetTrend({
  chart,
  performance,
  loading = false,
  error = "",
  range,
  onRangeChange,
  view,
  onViewChange,
  onRetry,
  totalLabel,
  pnlLabel,
  pnlPctLabel,
  pnlClassName,
  actions,
  updatedAt,
  isFetching = false,
}: OverviewAssetTrendProps) {
  const points =
    chart?.points.map((point) => ({
      date: point.date,
      total: point.totalAssetCny,
    })) ?? [];
  const performancePoints =
    performance?.series.map((point) => ({
      date: point.date,
      cumulativeTwr: point.cumulativeTwr,
      value: point.value,
    })) ?? [];
  const hasChart = points.length >= 2;
  const hasPerformanceChart = performancePoints.length >= 2;
  const performanceSummary = performance?.summary;
  const headline =
    view === "performance" && performanceSummary
      ? formatTwrPercent(performanceSummary.cumulativeTwr)
      : totalLabel;
  const subLine =
    view === "performance" && performanceSummary
      ? {
          main:
            performanceSummary.annualizedTwr !== null
              ? `年化 ${formatTwrPercent(performanceSummary.annualizedTwr)}`
              : "年化 --",
          detail: `${performanceSummary.days} 天`,
        }
      : {
          main: pnlLabel,
          detail: pnlPctLabel,
        };
  const chartContainerClassName =
    view === "performance"
      ? "absolute inset-x-0 bottom-0 top-60 md:top-52"
      : "absolute inset-x-0 bottom-0 top-32 md:top-28";

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={cn("relative", view === "performance" ? "min-h-[500px]" : "min-h-[420px]")}>
        <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-7">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {view === "performance" ? "收益率曲线" : "资产曲线"}
            </p>
            <h1 className="mt-3 truncate text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {headline}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  "text-base font-semibold md:text-lg",
                  view === "performance" ? "text-foreground" : pnlClassName
                )}
              >
                {subLine.main}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  view === "performance" ? "text-muted-foreground" : pnlClassName
                )}
              >
                {subLine.detail}
              </span>
              <span className="text-xs text-muted-foreground">
                {view === "performance" ? "累计 TWR" : "当前快照"}
              </span>
            </div>
            <DataFreshness updatedAt={updatedAt} isFetching={isFetching} className="mt-2" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={view === "netvalue" ? "default" : "outline"}
              onClick={() => onViewChange("netvalue")}
            >
              净值
            </Button>
            <Button
              size="sm"
              variant={view === "performance" ? "default" : "outline"}
              onClick={() => onViewChange("performance")}
            >
              收益率
            </Button>
            {actions}
          </div>
        </div>

        <div className={chartContainerClassName}>
          {loading && (view === "performance" ? !performance : !chart) ? (
            <div className="flex h-full items-end px-5 pb-10">
              <Skeleton className="h-[78%] w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm text-destructive">{error || "资产曲线加载失败"}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                重试
              </Button>
            </div>
          ) : view === "performance" && hasPerformanceChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={performancePoints}
                margin={{ top: 20, right: 8, bottom: 12, left: 8 }}
              >
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: OVERVIEW_ASSET_COLORS.axis, fontSize: 11 }}
                  minTickGap={28}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: OVERVIEW_ASSET_COLORS.axis, fontSize: 11 }}
                  tickFormatter={(value) => formatTwrPercent(Number(value))}
                  width={54}
                />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                <Tooltip
                  content={<PerformanceTooltip />}
                  cursor={{ stroke: OVERVIEW_ASSET_COLORS.cursor }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeTwr"
                  stroke={OVERVIEW_ASSET_COLORS.line}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: OVERVIEW_ASSET_COLORS.dot }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : view === "performance" ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              暂无足够收益率历史，积累至少两条净值记录后将显示收益率曲线。
            </div>
          ) : hasChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 20, right: 0, bottom: 12, left: 0 }}>
                <defs>
                  <linearGradient id="overviewAssetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={OVERVIEW_ASSET_COLORS.fill} stopOpacity={0.5} />
                    <stop offset="65%" stopColor={OVERVIEW_ASSET_COLORS.fill} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={OVERVIEW_ASSET_COLORS.fill} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: OVERVIEW_ASSET_COLORS.axis, fontSize: 11 }}
                  minTickGap={28}
                />
                <YAxis
                  hide
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => `¥${formatNumber(Number(value) / 10000, 0)}万`}
                />
                <Tooltip
                  content={<AssetTooltip />}
                  cursor={{ stroke: OVERVIEW_ASSET_COLORS.cursor }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={OVERVIEW_ASSET_COLORS.line}
                  strokeWidth={2}
                  fill="url(#overviewAssetFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: OVERVIEW_ASSET_COLORS.dot }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              暂无足够净值历史，后续记录净值后将显示资产曲线。
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border px-4 py-3">
        {NETVALUE_CHART_RANGE_ORDER.map((option) => (
          <Button
            key={option}
            size="xs"
            variant={option === range ? "default" : "ghost"}
            onClick={() => onRangeChange(option)}
            className={
              option === range ? "" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            {RANGE_LABELS[option]}
          </Button>
        ))}
      </div>
    </section>
  );
}
