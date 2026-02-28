"use client";

import { useState } from "react";
import { NotebookText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Holding, Account, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { HoldingEditDialog } from "@/components/holding-edit-dialog";
import { TransactionForm } from "@/components/transaction-form";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/format";

interface HoldingRowProps {
  holding: Holding;
  currency: string;
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  showAccountName?: boolean;
  accountName?: string;
  actions: "compact" | "full";
  accountId: number;
  accounts: Account[];
  allHoldings: Holding[];
  onDataChange: () => void;
  onDelete?: (id: number) => void;
}

export function HoldingRow({
  holding: h,
  currency,
  totalAssetCny,
  rates,
  colorMode,
  showAccountName,
  accountName,
  actions,
  accountId,
  accounts,
  allHoldings,
  onDataChange,
  onDelete,
}: HoldingRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<string>("buy");
  const [showMobileMemo, setShowMobileMemo] = useState(false);

  const sym = CURRENCY_SYMBOLS[currency] || "¥";

  const toCny = (val: number) => {
    if (currency === "CNY") return val;
    const pair = `${currency}/CNY`;
    return val * (rates[pair] ?? 1);
  };

  const valueCny = toCny(h.marketValue);
  const pctOfTotal = totalAssetCny > 0 ? (valueCny / totalAssetCny) * 100 : 0;
  // shares 模式：总成本 = cost(平均每股成本) × shares；amount 模式：总成本 = cost
  const totalCost = h.valuationMode === "shares" ? h.cost * h.shares : h.cost;
  const pnl = totalCost > 0 ? h.marketValue - totalCost : 0;
  const returnRate = totalCost > 0 ? (pnl / totalCost) * 100 : null;

  const openTx = (type: "buy" | "sell") => {
    setTxType(type);
    setTxOpen(true);
  };

  const pnlDisplay =
    returnRate !== null ? (
      <span className={`text-sm ${pnlColorClass(pnl, colorMode)}`}>
        {pnl > 0 ? "+" : ""}
        {sym}
        {formatAmount(pnl)}
        <span className="ml-1">
          ({returnRate > 0 ? "+" : ""}
          {formatPercent(returnRate)}%)
        </span>
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">--</span>
    );

  const actionButtons = (
    <>
      <Button
        size="sm"
        className="h-6 px-3 text-sm font-semibold shadow-sm"
        onClick={() => openTx("buy")}
      >
        交易
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setEditOpen(true)}
        aria-label="编辑持仓"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {actions === "full" && (
        <>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  aria-label="删除持仓"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定删除持仓&ldquo;{h.name}&rdquo;？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(h.id)}>确认</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}
    </>
  );

  const hasMemo = Boolean(h.memo?.trim());

  return (
    <>
      <div className="py-2 px-2 rounded hover:bg-accent/30">
        {/* Desktop: two-row horizontal layout */}
        <div className="hidden md:block">
          {/* Row 1: core info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{h.name}</span>
              {h.ticker && <span className="text-xs text-muted-foreground">{h.ticker}</span>}
              {hasMemo && (
                <div className="relative hidden md:flex items-center group">
                  <span className="inline-flex size-6 items-center justify-center rounded-md border border-orange-300 bg-orange-100 text-orange-700 shadow-sm">
                    <NotebookText className="size-4" />
                  </span>
                  <div className="pointer-events-none absolute left-1/2 top-full z-30 hidden min-w-52 max-w-80 -translate-x-1/2 rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
                    {h.memo}
                  </div>
                </div>
              )}
              {showAccountName && accountName && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {accountName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="font-semibold">
                {sym}
                {formatAmount(h.marketValue)}
                {currency !== "CNY" && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ≈ ¥{formatAmount(valueCny)}
                  </span>
                )}
              </span>
              {pnlDisplay}
            </div>
          </div>
          {/* Row 2: details + actions */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {h.valuationMode === "shares" && (
                <>
                  <span>份额 {formatShares(h.shares)}</span>
                  <span>·</span>
                  {h.cost > 0 && (
                    <>
                      <span>
                        成本价 {sym}
                        {formatPrice(h.cost)}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>
                    现价 {sym}
                    {formatPrice(h.price)}
                  </span>
                  <span>·</span>
                </>
              )}
              <span>占比 {formatPercent(pctOfTotal)}%</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">{actionButtons}</div>
          </div>
        </div>

        {/* Mobile: vertical stacked layout */}
        <div className="md:hidden space-y-1.5">
          {/* Row 1: name + tags */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{h.name}</span>
            {h.ticker && <span className="text-xs text-muted-foreground">{h.ticker}</span>}
            {hasMemo && (
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md border border-orange-300 bg-orange-100 text-orange-700 shadow-sm"
                onClick={() => setShowMobileMemo((prev) => !prev)}
                aria-label="查看持仓备注"
              >
                <NotebookText className="size-4" />
              </button>
            )}
            {showAccountName && accountName && (
              <Badge variant="outline" className="text-xs shrink-0">
                {accountName}
              </Badge>
            )}
          </div>
          {/* Row 2: value + pnl */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">
              {sym}
              {formatAmount(h.marketValue)}
              {currency !== "CNY" && (
                <span className="text-xs text-muted-foreground ml-1">
                  ≈ ¥{formatAmount(valueCny)}
                </span>
              )}
            </span>
            {pnlDisplay}
          </div>
          {/* Row 3: details */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {h.valuationMode === "shares" && (
              <>
                <span>份额 {formatShares(h.shares)}</span>
                <span>·</span>
                {h.cost > 0 && (
                  <>
                    <span>
                      成本价 {sym}
                      {formatPrice(h.cost)}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>
                  现价 {sym}
                  {formatPrice(h.price)}
                </span>
                <span>·</span>
              </>
            )}
            <span>占比 {formatPercent(pctOfTotal)}%</span>
          </div>
          {/* Row 4: actions */}
          <div className="flex items-center justify-end gap-4 flex-wrap">{actionButtons}</div>
          {hasMemo && showMobileMemo && (
            <div className="rounded border bg-popover px-2 py-1 text-xs text-popover-foreground">
              {h.memo}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      {editOpen && (
        <HoldingEditDialog
          holdingId={h.id}
          name={h.name}
          ticker={h.ticker}
          memo={h.memo}
          cost={h.cost}
          marketValue={h.marketValue}
          valuationMode={h.valuationMode}
          shares={h.shares}
          price={h.price}
          assetClass={h.assetClass}
          currency={currency}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onDataChange();
          }}
        />
      )}

      {/* Transaction Dialog */}
      <TransactionForm
        open={txOpen}
        onOpenChange={setTxOpen}
        onSaved={onDataChange}
        accounts={accounts}
        holdings={allHoldings}
        defaultType={txType}
        defaultAccountId={accountId}
        defaultHoldingId={h.id}
      />
    </>
  );
}
