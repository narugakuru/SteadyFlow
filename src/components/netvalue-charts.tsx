"use client";

import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { formatAmount, formatNumber, formatPercent } from "@/lib/utils/format";
import type { NetvalueChartResponse } from "@/lib/utils/types";
import { CLASS_COLORS, FALLBACK_COLOR } from "@/lib/visualization/chart-colors";

const NETVALUE_ASSET_LINE = "#168a56";
const NETVALUE_ASSET_FILL = "#58c786";
const NETVALUE_ASSET_DOT = "#0f7f4d";

interface NetvalueChartsProps {
  chart: NetvalueChartResponse;
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
                  <stop offset="0%" stopColor={NETVALUE_ASSET_FILL} stopOpacity={0.5} />
                  <stop offset="65%" stopColor={NETVALUE_ASSET_FILL} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={NETVALUE_ASSET_FILL} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(107, 114, 128, 0.85)", fontSize: 11 }}
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
                cursor={{ stroke: "rgba(15,23,42,0.12)" }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={NETVALUE_ASSET_LINE}
                strokeWidth={2.25}
                fill="url(#netvalueAssetFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: NETVALUE_ASSET_DOT }}
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
                tick={{ fill: "rgba(107, 114, 128, 0.85)", fontSize: 11 }}
                minTickGap={28}
              />
              <YAxis hide domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value: number | string | undefined, name: string | undefined) => [
                  `${formatPercent(Number(value ?? 0))}%`,
                  name ?? "",
                ]}
                labelFormatter={(label) => `日期: ${label}`}
                cursor={{ stroke: "rgba(15,23,42,0.12)" }}
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
