"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { AllocationItem } from "@/lib/utils/types";
import { getClassColor } from "@/lib/visualization/chart-colors";

interface DeviationChartProps {
  allocation: AllocationItem[];
}

export function DeviationChart({ allocation }: DeviationChartProps) {
  const formatPercent = (value: number, withSign = false) => {
    const absFormatted = Math.abs(value).toLocaleString("zh-CN", {
      maximumFractionDigits: 2,
    });
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${withSign ? sign : value < 0 ? "-" : ""}${absFormatted}%`;
  };

  const data = allocation.map((item) => ({
    name: item.name,
    deviation: item.deviation,
    color: getClassColor(item.name),
  }));

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.deviation)), 1);
  const bound = Math.ceil(maxAbs / 10) * 10; // 以 10% 为尺度向上取整
  const domain = [-bound, bound];

  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={40 * data.length + 30}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 5, bottom: 5 }}>
          <XAxis
            type="number"
            domain={domain}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13 }} width={42} />
          <ReferenceLine x={0} stroke="#d1d5db" />
          <Tooltip
            formatter={(value: number | undefined) => [
              formatPercent(Number(value ?? 0), true),
              "偏离度",
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar
            dataKey="deviation"
            barSize={20}
            label={{
              position: "right",
              fontSize: 12,
              formatter: (v: unknown) => formatPercent(Number(v), true),
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.deviation > 0 ? "#ef4444" : entry.deviation < 0 ? "#22c55e" : "#d1d5db"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
