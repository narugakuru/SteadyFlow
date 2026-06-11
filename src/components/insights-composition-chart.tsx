"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { getCurrencySymbol } from "@/lib/utils/display-currency";
import { formatAmount, formatPercent } from "@/lib/utils/format";
import { COMPOSITION_CHART_COLORS } from "@/lib/visualization/theme-colors";
import type { InsightsCompositionItem } from "@/lib/utils/types";

interface InsightsCompositionChartProps {
  title: string;
  items: InsightsCompositionItem[];
}

interface ChartTooltipPayload {
  payload?: InsightsCompositionItem;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
}

function CompositionTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as InsightsCompositionItem | undefined;
  if (!item) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl">
      <p className="font-medium">{item.name}</p>
      <p className="mt-1 text-muted-foreground">
        ¥{formatAmount(item.valueCny)} · {formatPercent(item.pct)}%
      </p>
    </div>
  );
}

export function InsightsCompositionChart({ title, items }: InsightsCompositionChartProps) {
  const hasData = items.some((item) => item.valueCny > 0);
  const primary = items[0];

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">{title}</h2>
      {hasData ? (
        <>
          <div className="relative mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="valueCny"
                  nameKey="name"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="66%"
                  outerRadius="96%"
                  cx="50%"
                  cy="80%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  {items.map((item, index) => (
                    <Cell
                      key={item.id}
                      fill={COMPOSITION_CHART_COLORS[index % COMPOSITION_CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CompositionTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {primary ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-5 text-center">
                <p className="truncate text-xs text-muted-foreground">{primary.name}</p>
                <p className="text-lg font-semibold text-foreground">
                  ¥{formatAmount(primary.valueCny)}
                </p>
                <p className="text-xs text-muted-foreground">{formatPercent(primary.pct)}%</p>
              </div>
            ) : null}
          </div>
          <div className="mt-2 space-y-2">
            {items.slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      COMPOSITION_CHART_COLORS[index % COMPOSITION_CHART_COLORS.length],
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {item.currency ? getCurrencySymbol(item.currency) : "¥"}
                  {formatAmount(item.value)}
                </span>
                <span className="w-14 shrink-0 text-right text-muted-foreground">
                  {formatPercent(item.pct)}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          暂无可用数据
        </div>
      )}
    </section>
  );
}
