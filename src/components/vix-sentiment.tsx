"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import { getVixSentimentLevel } from "@/lib/visualization/vix-sentiment";

interface VixSentimentProps {
  currentVix?: number | null;
}

export function VixSentiment({ currentVix }: VixSentimentProps) {
  const level = getVixSentimentLevel(currentVix);

  if (!level) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        当前 VIX 区间暂不可判定，等待最新可用收盘值。
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border px-4 py-3", level.surfaceClass)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-3xl leading-none">{level.emoji}</div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-base font-semibold", level.colorClass)}>{level.label}</span>
            <Badge variant="outline" className="bg-background/70">
              VIX {level.range}
            </Badge>
            {typeof currentVix === "number" && Number.isFinite(currentVix) ? (
              <Badge variant="outline" className="bg-background/70">
                当前 {currentVix.toFixed(2)}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{level.tip}</p>
        </div>
      </div>
    </div>
  );
}
