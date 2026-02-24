"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { AllocationItem } from "@/lib/types";

// Color schemes per asset class
const CLASS_COLORS: Record<string, string> = {
  股票基金: "#3b82f6",
  黄金: "#eab308",
  债券: "#22c55e",
  现金: "#9ca3af",
};

const CLASS_GRADIENTS: Record<string, string[]> = {
  股票基金: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  黄金: ["#eab308", "#facc15", "#fde047", "#fef08a", "#fef9c3"],
  债券: ["#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"],
  现金: ["#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb"],
};

type ViewMode = "category" | "holding";

interface PortfolioChartProps {
  allocation: AllocationItem[];
}

export function PortfolioChart({ allocation }: PortfolioChartProps) {
  const [view, setView] = useState<ViewMode>("category");

  const categoryData = allocation
    .filter((a) => a.actualValue > 0)
    .map((a) => ({
      name: a.name,
      value: a.actualValue,
      pct: a.actualPct,
      color: CLASS_COLORS[a.name] || "#6b7280",
    }));

  const holdingData: { name: string; value: number; pct: number; color: string }[] = [];
  for (const cls of allocation) {
    const gradients = CLASS_GRADIENTS[cls.name] || ["#6b7280"];
    cls.holdings.forEach((h, i) => {
      if (h.marketValueCny > 0) {
        holdingData.push({
          name: h.name,
          value: h.marketValueCny,
          pct: h.pctOfTotal,
          color: gradients[i % gradients.length],
        });
      }
    });
  }

  const data = view === "category" ? categoryData : holdingData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { name, pct } = props as { name: string; pct: number };
    if (pct < 3) return "";
    return `${name} ${pct}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">资产分布</h2>
        <div className="flex gap-1">
          <Button
            variant={view === "category" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("category")}
          >
            按大类
          </Button>
          <Button
            variant={view === "holding" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("holding")}
          >
            按标的
          </Button>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无数据</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                `¥${Number(value).toLocaleString()}`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
