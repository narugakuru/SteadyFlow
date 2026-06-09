"use client";

import { useState } from "react";
import { MoreVertical, NotebookText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { convertCurrency, convertToCny, getCurrencySymbol } from "@/lib/utils/display-currency";
import { HoldingEditDialog } from "@/components/holding-edit-dialog";
import { TransactionForm } from "@/components/transaction-form";
import { formatAmount, formatPercent, formatPrice, formatShares } from "@/lib/utils/format";
import { Holding, Account, pnlColorClass, type DisplayCurrencyMode } from "@/lib/utils/types";

interface HoldingRowProps {
  holding: Holding;
  currency: string;
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  displayCurrency?: DisplayCurrencyMode;
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
  displayCurrency = "default",
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

  const valueCny = convertToCny(h.marketValue, currency, rates);
  const pctOfTotal = totalAssetCny > 0 ? (valueCny / totalAssetCny) * 100 : 0;
  // shares 模式：总成本 = cost(平均每股成本) × shares；amount 模式：总成本 = cost
  const totalCost = h.valuationMode === "shares" ? h.cost * h.shares : h.cost;
  const pnl = totalCost > 0 ? h.marketValue - totalCost : 0;
  const returnRate = totalCost > 0 ? (pnl / totalCost) * 100 : null;
  const displayAmountCurrency = displayCurrency === "default" ? currency : displayCurrency;
  const displayMarketValue =
    displayCurrency === "default"
      ? h.marketValue
      : convertCurrency(h.marketValue, currency, displayCurrency, rates);
  const displayPnl =
    displayCurrency === "default" ? pnl : convertCurrency(pnl, currency, displayCurrency, rates);
  const amountSymbol = getCurrencySymbol(displayAmountCurrency);
  const sourceSymbol = getCurrencySymbol(currency);

  const openTx = (type: "buy" | "sell") => {
    setTxType(type);
    setTxOpen(true);
  };

  const hasMemo = Boolean(h.memo?.trim());

  const memoIndicator = hasMemo ? (
    <div className="relative flex items-center">
      <span className="hidden size-6 items-center justify-center rounded-md border border-orange-300 bg-orange-100 text-orange-700 shadow-sm group md:inline-flex">
        <NotebookText className="size-4" />
        <div className="pointer-events-none absolute left-1/2 top-full z-30 hidden min-w-52 max-w-80 -translate-x-1/2 rounded border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
          {h.memo}
        </div>
      </span>
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-md border border-orange-300 bg-orange-100 text-orange-700 shadow-sm md:hidden"
        onClick={() => setShowMobileMemo((prev) => !prev)}
        aria-label="查看持仓备注"
      >
        <NotebookText className="size-4" />
      </button>
    </div>
  ) : null;

  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-11 text-muted-foreground hover:text-foreground md:size-8"
          aria-label={`打开${h.name}操作菜单`}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-28">
        <DropdownMenuItem onSelect={() => openTx("buy")}>买入</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openTx("sell")}>卖出</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setEditOpen(true)}>编辑</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const deleteAction =
    actions === "full" && onDelete ? (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="删除持仓"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定删除持仓&ldquo;{h.name}&rdquo;？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(h.id)}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null;

  const actionArea = (
    <div className="flex items-center justify-end gap-1">
      {actionMenu}
      {deleteAction}
    </div>
  );

  const assetInfo = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-semibold text-foreground">{h.name}</span>
      {h.ticker && <span className="shrink-0 text-xs text-muted-foreground">{h.ticker}</span>}
      {showAccountName && accountName && (
        <Badge variant="outline" className="shrink-0 text-xs">
          {accountName}
        </Badge>
      )}
      {memoIndicator}
    </div>
  );

  const sharesBlock =
    h.valuationMode === "shares" ? (
      <span>{formatShares(h.shares)}</span>
    ) : (
      <span className="text-muted-foreground">--</span>
    );

  const priceBlock =
    h.valuationMode === "shares" ? (
      <>
        <span className="font-medium text-foreground">
          {sourceSymbol}
          {formatPrice(h.price)}
        </span>
        <span className="text-xs text-muted-foreground">
          成本 {sourceSymbol}
          {formatPrice(h.cost)}
        </span>
      </>
    ) : (
      <>
        <span className="font-medium text-foreground">--</span>
        <span className="text-xs text-muted-foreground">
          成本 {sourceSymbol}
          {formatAmount(h.cost)}
        </span>
      </>
    );

  const valueWeightBlock = (
    <>
      <span className="font-semibold text-foreground md:text-base">
        {amountSymbol}
        {formatAmount(displayMarketValue)}
      </span>
      <span className="text-xs text-muted-foreground">占比 {formatPercent(pctOfTotal)}%</span>
    </>
  );

  const pnlBlock = (
    <>
      {returnRate !== null ? (
        <>
          <span className={`font-medium ${pnlColorClass(displayPnl, colorMode)}`}>
            {displayPnl > 0 ? "+" : ""}
            {amountSymbol}
            {formatAmount(displayPnl)}
          </span>
          <span className={`text-xs ${pnlColorClass(displayPnl, colorMode)}`}>
            {returnRate > 0 ? "+" : ""}
            {formatPercent(returnRate)}%
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">--</span>
      )}
    </>
  );

  return (
    <>
      <div className="rounded-md px-2 py-2 hover:bg-accent/30 md:px-3">
        <div className="hidden min-h-12 grid-cols-[minmax(9rem,1.7fr)_minmax(4.5rem,0.75fr)_minmax(6rem,0.9fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(3rem,auto)] items-center gap-4 md:grid">
          <div className="min-w-0">{assetInfo}</div>
          <div className="text-right text-sm tabular-nums">{sharesBlock}</div>
          <div className="flex flex-col items-end gap-0.5 text-right tabular-nums">
            {priceBlock}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right tabular-nums">
            {valueWeightBlock}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right tabular-nums">{pnlBlock}</div>
          {actionArea}
        </div>

        <div className="space-y-3 rounded-md border bg-card px-3 py-3 md:hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">{assetInfo}</div>
            {actionArea}
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-col">
              <span className="text-lg font-semibold leading-tight">
                {amountSymbol}
                {formatAmount(displayMarketValue)}
              </span>
              <span className="text-xs text-muted-foreground">
                占比 {formatPercent(pctOfTotal)}%
              </span>
            </div>
            <div className="flex flex-col items-end text-right tabular-nums">{pnlBlock}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground">现价</div>
              <div className="mt-0.5 font-medium text-foreground tabular-nums">
                {h.valuationMode === "shares" ? `${sourceSymbol}${formatPrice(h.price)}` : "--"}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground">成本</div>
              <div className="mt-0.5 font-medium text-foreground tabular-nums">
                {sourceSymbol}
                {h.valuationMode === "shares" ? formatPrice(h.cost) : formatAmount(h.cost)}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground">份额</div>
              <div className="mt-0.5 font-medium text-foreground tabular-nums">
                {h.valuationMode === "shares" ? formatShares(h.shares) : "--"}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <div className="text-muted-foreground">模式</div>
              <div className="mt-0.5 font-medium text-foreground">
                {h.valuationMode === "shares" ? "份额" : "金额"}
              </div>
            </div>
          </div>
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
