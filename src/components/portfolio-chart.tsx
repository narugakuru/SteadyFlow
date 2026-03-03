"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { AllocationItem } from "@/lib/types";
import { getClassColor, getClassGradients } from "@/lib/visualization/chart-colors";
import { formatAmount, formatPercent } from "@/lib/format";

type ViewMode = "category" | "holding";

interface PortfolioChartProps {
  allocation: AllocationItem[];
}

export function PortfolioChart({ allocation }: PortfolioChartProps) {
  const [view, setView] = useState<ViewMode>("category");

  // 外环：实际配置（按大类）
  const categoryData = allocation
    .filter((a) => a.actualValue > 0)
    .map((a) => ({
      name: a.name,
      value: a.actualValue,
      pct: a.actualPct,
      color: getClassColor(a.name),
      ring: "outer" as const,
    }));

  // 外环：实际配置（按标的）
  const holdingData: { name: string; value: number; pct: number; color: string; ring: "outer" }[] =
    [];
  for (const cls of allocation) {
    const gradients = getClassGradients(cls.name);
    cls.holdings.forEach((h, i) => {
      if (h.marketValueCny > 0) {
        holdingData.push({
          name: h.name,
          value: h.marketValueCny,
          pct: h.pctOfTotal,
          color: gradients[i % gradients.length],
          ring: "outer",
        });
      }
    });
  }

  // 内环：目标配置
  const targetData = allocation
    .filter((a) => a.targetPct > 0)
    .map((a) => ({
      name: a.name,
      value: a.targetPct,
      pct: a.targetPct,
      color: getClassColor(a.name),
      ring: "inner" as const,
    }));

  const outerData = view === "category" ? categoryData : holdingData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderOuterLabel = (props: any) => {
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
            类别
          </Button>
          <Button
            variant={view === "holding" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("holding")}
          >
            标的
          </Button>
        </div>
      </div>
      {outerData.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无数据</p>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {/* 内环：目标配置 */}
              <Pie
                data={targetData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                opacity={0.5}
              >
                {targetData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              {/* 外环：实际配置 */}
              <Pie
                data={outerData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                label={renderOuterLabel}
                labelLine={false}
              >
                {outerData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any, props: any) => {
                  const ring = props?.payload?.ring;
                  if (ring === "inner") {
                    return [`${formatPercent(Number(value))}%`, name];
                  }
                  return [`¥${formatAmount(Number(value))}`, name];
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center -mt-2">
            外环：实际配置 · 内环：目标配置
          </p>
        </div>
      )}
    </div>
  );
}
