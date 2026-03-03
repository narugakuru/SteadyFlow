"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { NetvalueRecord } from "@/lib/utils/types";
import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { CLASS_COLORS, FALLBACK_COLOR } from "@/lib/visualization/chart-colors";
import { formatAmount, formatNumber, formatPercent } from "@/lib/utils/format";

interface NetvalueChartsProps {
  records: NetvalueRecord[];
}

export function NetvalueCharts({ records }: NetvalueChartsProps) {
  if (records.length < 2) return null;

  // 按日期正序排列
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // 折线图数据
  const trendData = sorted.map((s) => ({
    date: s.date,
    total: s.totalAssetCny,
  }));

  // 堆叠面积图数据：收集所有出现过的资产类别名
  const allClassNames = new Set<string>();
  for (const s of sorted) {
    for (const a of s.dataJson.allocation) {
      allClassNames.add(normalizeAssetClassName(a.name));
    }
  }
  const classNames = Array.from(allClassNames).sort((a, b) => {
    const aOrder = getDefaultAssetClassOrderIndex(a);
    const bOrder = getDefaultAssetClassOrderIndex(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b, "zh-CN");
  });

  const areaData = sorted.map((s) => {
    const row: Record<string, string | number> = { date: s.date };
    for (const name of classNames) {
      const item = s.dataJson.allocation.find((a) => normalizeAssetClassName(a.name) === name);
      row[name] = item ? item.actualPct : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      {/* 总资产走势折线图 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">总资产走势</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `¥${formatNumber(v / 10000, 0)}万`}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`¥${formatAmount(Number(value))}`, "总资产"]}
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

      {/* 资产类别占比堆叠面积图 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">资产占比趋势</h2>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={areaData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`${formatPercent(Number(value))}%`, name]}
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
