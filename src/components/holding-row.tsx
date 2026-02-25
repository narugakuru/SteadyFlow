"use client";

import { useState } from "react";
import Link from "next/link";
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

  const sym = CURRENCY_SYMBOLS[currency] || "¥";

  const toCny = (val: number) => {
    if (currency === "CNY") return val;
    const pair = `${currency}/CNY`;
    return val * (rates[pair] ?? 1);
  };

  const valueCny = toCny(h.marketValue);
  const pctOfTotal = totalAssetCny > 0 ? ((valueCny / totalAssetCny) * 100).toFixed(2) : "0";
  const pnl = h.cost > 0 ? h.marketValue - h.cost : 0;
  const returnRate = h.cost > 0 ? +((pnl / h.cost) * 100).toFixed(2) : null;

  const openTx = (type: "buy" | "sell") => {
    setTxType(type);
    setTxOpen(true);
  };

  return (
    <>
      <div className="py-2 px-2 rounded hover:bg-accent/30">
        {/* Row 1: core info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{h.name}</span>
            {h.ticker && <span className="text-xs text-muted-foreground">{h.ticker}</span>}
            {showAccountName && accountName && (
              <Badge variant="outline" className="text-xs shrink-0">{accountName}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-semibold">
              {sym}{h.marketValue.toLocaleString()}
              {currency !== "CNY" && (
                <span className="text-xs text-muted-foreground ml-1">≈ ¥{valueCny.toLocaleString()}</span>
              )}
            </span>
            {returnRate !== null ? (
              <span className={`text-sm ${pnlColorClass(pnl, colorMode)}`}>
                {pnl > 0 ? "+" : ""}{sym}{pnl.toLocaleString()}
                <span className="ml-1">({returnRate > 0 ? "+" : ""}{returnRate.toFixed(2)}%)</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">--</span>
            )}
          </div>
        </div>

        {/* Row 2: details + actions */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {h.valuationMode === "shares" && (
              <>
                <span>份额 {h.shares.toLocaleString()}</span>
                <span>·</span>
                {h.shares > 0 && (
                  <>
                    <span>均价 {sym}{(h.cost / h.shares).toFixed(4)}</span>
                    <span>·</span>
                  </>
                )}
                <span>股价 {sym}{h.price}</span>
                <span>·</span>
              </>
            )}
            <span>占比 {pctOfTotal}%</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openTx("buy")}>交易</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditOpen(true)}>编辑</Button>
            {actions === "full" && (
              <>
                <Link href={`/transactions?accountId=${accountId}`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">交易记录 →</Button>
                </Link>
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive">删除</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>确定删除持仓"{h.name}"？</AlertDialogDescription>
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
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editOpen && (
        <HoldingEditDialog
          holdingId={h.id}
          name={h.name}
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
