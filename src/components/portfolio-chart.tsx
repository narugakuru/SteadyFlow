"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type LegendPayload,
  type PieLabelRenderProps,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  convertCurrency,
  convertFromCny,
  getCurrencySymbol,
  getSummaryCurrency,
} from "@/lib/utils/display-currency";
import { getClassColor, getClassGradients } from "@/lib/visualization/chart-colors";
import { formatAmount } from "@/lib/utils/format";
import { AllocationItem, type DisplayCurrencyMode } from "@/lib/utils/types";

type ViewMode = "category" | "holding";

type ChartLegendMeta = {
  legendKey: string;
  legendLabel: string;
  isCash: boolean;
};

type OuterChartDatum = ChartLegendMeta & {
  name: string;
  value: number;
  pct: number;
  color: string;
  ring: "outer";
};

type InnerChartDatum = ChartLegendMeta & {
  name: string;
  value: number;
  pct: number;
  color: string;
  ring: "inner";
};

interface PortfolioChartProps {
  allocation: AllocationItem[];
  rates: Record<string, number>;
  displayCurrency?: DisplayCurrencyMode;
}

export function PortfolioChart({
  allocation,
  rates,
  displayCurrency = "default",
}: PortfolioChartProps) {
  const [view, setView] = useState<ViewMode>("category");
  const chartCurrency = getSummaryCurrency(displayCurrency);
  const chartSymbol = getCurrencySymbol(chartCurrency);
  const formatChartPercent = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : "0.00";

  // 外环：实际配置（按大类）
  const categoryData: OuterChartDatum[] = allocation
    .filter((a) => a.actualValue > 0)
    .map((a) => ({
      name: a.name,
      value: convertFromCny(a.actualValue, chartCurrency, rates),
      pct: a.actualPct,
      color: getClassColor(a.name),
      ring: "outer" as const,
      legendKey: `outer-category-${a.id}`,
      legendLabel: a.name,
      isCash: a.name === "现金",
    }));

  // 外环：实际配置（按标的）
  const holdingData: OuterChartDatum[] = [];
  for (const cls of allocation) {
    const gradients = getClassGradients(cls.name);
    const isCashClass = cls.name === "现金";
    cls.holdings.forEach((h, i) => {
      if (h.marketValueCny > 0) {
        holdingData.push({
          name: h.name,
          value:
            chartCurrency === "CNY"
              ? h.marketValueCny
              : convertCurrency(h.marketValue, h.currency, chartCurrency, rates),
          pct: h.pctOfTotal,
          color: gradients[i % gradients.length],
          ring: "outer",
          legendKey: `outer-holding-${h.id}`,
          legendLabel: isCashClass ? "现金" : h.name,
          isCash: isCashClass,
        });
      }
    });
  }

  // 内环：目标配置
  const targetData: InnerChartDatum[] = allocation
    .filter((a) => a.targetPct > 0)
    .map((a) => ({
      name: a.name,
      value: a.targetPct,
      pct: a.targetPct,
      color: getClassColor(a.name),
      ring: "inner" as const,
      legendKey: `inner-target-${a.id}`,
      legendLabel: a.name,
      isCash: a.name === "现金",
    }));

  const outerData = view === "category" ? categoryData : holdingData;

  const getLegendMeta = (entry: LegendPayload): Partial<ChartLegendMeta> | undefined => {
    const payload = entry.payload;
    if (!payload || typeof payload !== "object") return undefined;
    return payload as Partial<ChartLegendMeta>;
  };

  const renderOuterLabel = ({
    x,
    y,
    textAnchor,
    name,
    pct,
  }: PieLabelRenderProps & { pct?: number }) => {
    if (typeof x !== "number" || typeof y !== "number" || typeof pct !== "number" || pct < 3) {
      return null;
    }
    const labelName = typeof name === "string" || typeof name === "number" ? String(name) : "";

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        fontSize={12}
        textAnchor={textAnchor}
        dominantBaseline="central"
      >
        {`${labelName} ${formatChartPercent(pct)}%`}
      </text>
    );
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
                    return [`${formatChartPercent(Number(value))}%`, name];
                  }
                  return [`${chartSymbol}${formatAmount(Number(value))}`, name];
                }}
              />
              <Legend
                iconSize={12}
                wrapperStyle={{ fontSize: "12px", lineHeight: "16px" }}
                payloadUniqBy={(entry) => {
                  const meta = getLegendMeta(entry);
                  return meta?.isCash
                    ? "cash"
                    : (meta?.legendKey ?? `${entry.value}-${entry.color}`);
                }}
                formatter={(value, entry) => getLegendMeta(entry)?.legendLabel ?? value}
              />
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
