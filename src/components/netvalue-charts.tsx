"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { formatAmount, formatNumber, formatPercent } from "@/lib/utils/format";
import type { NetvalueChartResponse } from "@/lib/utils/types";
import { CLASS_COLORS, FALLBACK_COLOR } from "@/lib/visualization/chart-colors";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">总资产走势</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `¥${formatNumber(Number(value) / 10000, 0)}万`}
            />
            <Tooltip
              formatter={(value: number | string | undefined) => [
                `¥${formatAmount(Number(value ?? 0))}`,
                "总资产",
              ]}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">资产占比趋势</h2>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={areaData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                `${formatPercent(Number(value ?? 0))}%`,
                name ?? "",
              ]}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Legend />
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
    </div>
  );
}
