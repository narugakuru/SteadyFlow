"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils/format";

export interface PriceUpdatedItem {
  id: number;
  name: string;
  ticker: string;
  oldPrice: number;
  newPrice: number;
  provider: string;
  source: "realtime" | "previous_close";
}

export interface PriceFailedItem {
  id: number;
  name: string;
  ticker: string;
  error: string;
}

export interface PriceSkippedItem {
  id: number;
  name: string;
  ticker: string | null;
  reason: string;
}

export interface PriceUpdateResult {
  updated: PriceUpdatedItem[];
  failed: PriceFailedItem[];
  skipped: PriceSkippedItem[];
}

interface PriceUpdateResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PriceUpdateResult | null;
}

export function PriceUpdateResultDialog({
  open,
  onOpenChange,
  result,
}: PriceUpdateResultDialogProps) {
  const updated = result?.updated ?? [];
  const failed = result?.failed ?? [];
  const skipped = result?.skipped ?? [];
  const total = updated.length + failed.length + skipped.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>股价更新明细</DialogTitle>
          <DialogDescription>
            成功 {updated.length} 条，失败 {failed.length} 条，跳过 {skipped.length} 条
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          {total === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">暂无明细</p>
          ) : (
            <ul className="divide-y text-xs md:text-sm">
              {updated.map((item) => (
                <li key={`u-${item.id}`} className="px-3 py-2 font-mono">
                  [成功] {item.ticker} {item.name} 最新价 {formatPrice(item.newPrice)}（
                  {item.provider}/{item.source === "realtime" ? "实时" : "昨收"}）
                </li>
              ))}
              {failed.map((item) => (
                <li key={`f-${item.id}`} className="px-3 py-2 font-mono text-destructive">
                  [失败] {item.ticker} {item.name} {item.error}
                </li>
              ))}
              {skipped.map((item) => (
                <li key={`s-${item.id}`} className="px-3 py-2 font-mono text-muted-foreground">
                  [跳过] {item.ticker || "--"} {item.name} {item.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
