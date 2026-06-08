"use client";

import { useMemo } from "react";

import { formatAmount, formatPercent } from "@/lib/utils/format";
import type { InsightsHeatmapHolding, Settings } from "@/lib/utils/types";

interface InsightsHeatmapProps {
  holdings: InsightsHeatmapHolding[];
  colorMode: Settings["colorMode"];
}

interface Rect {
  item: InsightsHeatmapHolding;
  x: number;
  y: number;
  width: number;
  height: number;
}

function splitItems(items: InsightsHeatmapHolding[]) {
  const total = items.reduce((sum, item) => sum + item.marketValueCny, 0);
  let running = 0;
  let splitIndex = 1;

  for (let index = 0; index < items.length; index += 1) {
    const next = running + items[index].marketValueCny;
    if (next >= total / 2) {
      splitIndex = index + 1;
      break;
    }
    running = next;
  }

  return [items.slice(0, splitIndex), items.slice(splitIndex)] as const;
}

function layoutTreemap(
  items: InsightsHeatmapHolding[],
  x: number,
  y: number,
  width: number,
  height: number
): Rect[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];
  if (items.length === 1) {
    return [{ item: items[0], x, y, width, height }];
  }

  const total = items.reduce((sum, item) => sum + item.marketValueCny, 0);
  if (total <= 0) return [];

  const [first, second] = splitItems(items);
  const firstTotal = first.reduce((sum, item) => sum + item.marketValueCny, 0);
  const ratio = firstTotal / total;

  if (width >= height) {
    const firstWidth = width * ratio;
    return [
      ...layoutTreemap(first, x, y, firstWidth, height),
      ...layoutTreemap(second, x + firstWidth, y, width - firstWidth, height),
    ];
  }

  const firstHeight = height * ratio;
  return [
    ...layoutTreemap(first, x, y, width, firstHeight),
    ...layoutTreemap(second, x, y + firstHeight, width, height - firstHeight),
  ];
}

function getHeatColor(returnRate: number | null, colorMode: Settings["colorMode"]) {
  if (returnRate === null || returnRate === 0) return "#3a3a35";
  const positiveColor = colorMode === "cn" ? "#9b3f38" : "#6f8f31";
  const negativeColor = colorMode === "cn" ? "#6f8f31" : "#9b3f38";
  return returnRate > 0 ? positiveColor : negativeColor;
}

export function InsightsHeatmap({ holdings, colorMode }: InsightsHeatmapProps) {
  const rects = useMemo(
    () =>
      layoutTreemap(
        holdings.filter((holding) => holding.marketValueCny > 0),
        0,
        0,
        100,
        100
      ),
    [holdings]
  );

  if (rects.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-white/10 bg-[#181916] text-sm text-neutral-500">
        暂无非零市值持仓
      </div>
    );
  }

  return (
    <div className="relative h-[440px] overflow-hidden rounded-lg border border-[#10110f] bg-[#10110f] md:h-[520px]">
      {rects.map((rect) => {
        const labelFits = rect.width >= 14 && rect.height >= 12;
        const detailFits = rect.width >= 18 && rect.height >= 18;
        const title = `${rect.item.name}\n${rect.item.accountName}\n¥${formatAmount(
          rect.item.marketValueCny
        )}\n盈亏 ${
          rect.item.returnRate === null ? "--" : `${formatPercent(rect.item.returnRate)}%`
        }`;

        return (
          <div
            key={rect.item.id}
            title={title}
            className="absolute overflow-hidden rounded-md border border-[#10110f] p-2 text-neutral-100"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              backgroundColor: getHeatColor(rect.item.returnRate, colorMode),
            }}
          >
            {labelFits ? (
              <div className="flex h-full flex-col justify-center text-center leading-tight">
                <span className="truncate text-sm font-semibold">
                  {rect.item.ticker || rect.item.name}
                </span>
                {detailFits ? (
                  <>
                    <span className="mt-1 truncate text-xs text-neutral-200/85">
                      {rect.item.returnRate === null
                        ? "--"
                        : `${rect.item.returnRate > 0 ? "+" : ""}${formatPercent(
                            rect.item.returnRate
                          )}%`}
                    </span>
                    <span className="mt-1 truncate text-[11px] text-neutral-200/70">
                      ¥{formatAmount(rect.item.marketValueCny)}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
