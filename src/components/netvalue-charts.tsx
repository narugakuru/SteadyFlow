"use client";

import {
  Area,
  AreaChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { formatAmount, formatNumber, formatPercent } from "@/lib/utils/format";
import type { NetvalueChartResponse, NetvaluePerformanceResponse } from "@/lib/utils/types";
import { CLASS_COLORS, FALLBACK_COLOR } from "@/lib/visualization/chart-colors";
import { OVERVIEW_ASSET_COLORS } from "@/lib/visualization/theme-colors";

interface NetvalueChartsProps {
  chart: NetvalueChartResponse;
}

interface PerformanceChartProps {
  performance: NetvaluePerformanceResponse;
  title?: string;
}

interface PerformanceTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: {
      cumulativeTwr?: number;
      value?: number;
    };
  }>;
  label?: string | number;
}

function formatTwrPercent(value: number) {
  const percent = Number.isFinite(value) ? value * 100 : 0;
  return `${percent > 0 ? "+" : ""}${formatPercent(percent)}%`;
}

export function PerformanceLineChart({ performance, title = "收益率曲线" }: PerformanceChartProps) {
  if (performance.series.length < 2) return null;

  const data = performance.series.map((point) => ({
    date: point.date,
    cumulativeTwr: point.cumulativeTwr,
    value: point.value,
  }));

  const renderTooltip = ({ active, payload, label }: PerformanceTooltipProps) => {
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
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            区间累计 {formatTwrPercent(performance.summary.cumulativeTwr)}
            {performance.summary.annualizedTwr !== null
              ? ` / 年化 ${formatTwrPercent(performance.summary.annualizedTwr)}`
              : ""}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{performance.summary.days} 天</p>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
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
            <Tooltip content={renderTooltip} cursor={{ stroke: OVERVIEW_ASSET_COLORS.cursor }} />
            <Line
              type="monotone"
              dataKey="cumulativeTwr"
              stroke={OVERVIEW_ASSET_COLORS.line}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: OVERVIEW_ASSET_COLORS.dot }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function NetvalueCharts({ chart }: NetvalueChartsProps) {
  if (chart.points.length < 2) return null;

  const trendData = chart.points.map((point) => ({
    date: point.date,
    total: point.totalAssetCny,
  }));

  const allClassNames = new Set<string>();
  for (const point of chart.points) {
    for (const allocation of point.allocation) {
      allClassNames.add(normalizeAssetClassName(allocation.name));
    }
  }

  const classNames = Array.from(allClassNames).sort((a, b) => {
    const aOrder = getDefaultAssetClassOrderIndex(a);
    const bOrder = getDefaultAssetClassOrderIndex(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b, "zh-CN");
  });

  const areaData = chart.points.map((point) => {
    const row: Record<string, string | number> = { date: point.date };
    for (const name of classNames) {
      const item = point.allocation.find(
        (allocation) => normalizeAssetClassName(allocation.name) === name
      );
      row[name] = item ? item.actualPct : 0;
    }
    return row;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">总资产走势</h2>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="netvalueAssetFill" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value: number | string | undefined) => [
                  `¥${formatAmount(Number(value ?? 0))}`,
                  "总资产",
                ]}
                labelFormatter={(label) => `日期: ${label}`}
                cursor={{ stroke: OVERVIEW_ASSET_COLORS.cursor }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={OVERVIEW_ASSET_COLORS.line}
                strokeWidth={2.25}
                fill="url(#netvalueAssetFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: OVERVIEW_ASSET_COLORS.dot }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">资产占比趋势</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: OVERVIEW_ASSET_COLORS.axis, fontSize: 11 }}
                minTickGap={28}
              />
              <YAxis hide domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value: number | string | undefined, name: string | undefined) => [
                  `${formatPercent(Number(value ?? 0))}%`,
                  name ?? "",
                ]}
                labelFormatter={(label) => `日期: ${label}`}
                cursor={{ stroke: OVERVIEW_ASSET_COLORS.cursor }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {classNames.map((name) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stackId="1"
                  fill={CLASS_COLORS[name] || FALLBACK_COLOR}
                  stroke={CLASS_COLORS[name] || FALLBACK_COLOR}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
