"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Holding, Account, CURRENCY_SYMBOLS } from "@/lib/types";
import { useFetch } from "@/lib/hooks";

const ASSET_CLASS_COLORS: Record<string, string> = {
  股票基金: "bg-blue-100 text-blue-800",
  黄金: "bg-yellow-100 text-yellow-800",
  债券: "bg-green-100 text-green-800",
};

interface HoldingFormProps {
  holding?: Holding;
  accountId: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function HoldingForm({ holding, accountId, currency, open, onOpenChange, onSaved }: HoldingFormProps) {
  const [name, setName] = useState(holding?.name ?? "");
  const [marketValue, setMarketValue] = useState(holding?.marketValue?.toString() ?? "");
  const [assetClass, setAssetClass] = useState<string>(holding?.assetClass ?? "股票基金");
  const [saving, setSaving] = useState(false);
  const isEdit = !!holding;

  const handleSubmit = async () => {
    setSaving(true);
    const url = isEdit ? `/api/holdings/${holding.id}` : "/api/holdings";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isEdit ? {} : { accountId }),
        name,
        marketValue: parseFloat(marketValue) || 0,
        assetClass,
      }),
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑持仓" : "添加持仓"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>持仓名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：沪深300ETF" />
          </div>
          <div>
            <Label>市值 ({CURRENCY_SYMBOLS[currency]})</Label>
            <Input
              type="number"
              value={marketValue}
              onChange={(e) => setMarketValue(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>资产类别</Label>
            <Select value={assetClass} onValueChange={setAssetClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="股票基金">股票基金</SelectItem>
                <SelectItem value="黄金">黄金</SelectItem>
                <SelectItem value="债券">债券</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HoldingsPanelProps {
  account: Account;
  totalAssetCny: number;
  rates: Record<string, number>;
  onBack: () => void;
  onDataChange: () => void;
}

export function HoldingsPanel({ account, totalAssetCny, rates, onBack, onDataChange }: HoldingsPanelProps) {
  const { data: allHoldings, refetch } = useFetch<Holding[]>("/api/holdings");
  const [createOpen, setCreateOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<Holding | null>(null);

  const holdings = (allHoldings ?? []).filter((h) => h.accountId === account.id);
  const sym = CURRENCY_SYMBOLS[account.currency];

  const toCny = (val: number) => {
    if (account.currency === "CNY") return val;
    const pair = `${account.currency}/CNY`;
    return val * (rates[pair] ?? 1);
  };

  const handleSaved = () => {
    refetch();
    onDataChange();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    handleSaved();
  };

  const holdingsTotal = holdings.reduce((s, h) => s + h.marketValue, 0);
  const cash = Math.max(0, account.totalBalance - holdingsTotal);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>← 返回</Button>
        <h2 className="text-lg font-semibold">{account.name}</h2>
        <Badge variant="outline">{account.currency}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded p-3">
          <p className="text-muted-foreground">总额</p>
          <p className="font-semibold">{sym}{account.totalBalance.toLocaleString()}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">持仓</p>
          <p className="font-semibold">{sym}{holdingsTotal.toLocaleString()}</p>
        </div>
        <div className="border rounded p-3">
          <p className="text-muted-foreground">现金</p>
          <p className="font-semibold">{sym}{cash.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">持仓列表</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ 添加持仓</Button>
      </div>

      {holdings.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">暂无持仓</p>
      ) : (
        <div className="space-y-2">
          {holdings.map((h) => {
            const valueCny = toCny(h.marketValue);
            const pctOfTotal = totalAssetCny > 0 ? ((valueCny / totalAssetCny) * 100).toFixed(2) : "0";
            return (
              <div key={h.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.name}</span>
                    <Badge variant="secondary" className={ASSET_CLASS_COLORS[h.assetClass]}>
                      {h.assetClass}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sym}{h.marketValue.toLocaleString()}
                    {account.currency !== "CNY" && ` ≈ ¥${valueCny.toLocaleString()}`}
                    {" · "}占总资产 {pctOfTotal}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditHolding(h)}>编辑</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">删除</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>确定删除持仓"{h.name}"？</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(h.id)}>确认</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HoldingForm
        accountId={account.id}
        currency={account.currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={handleSaved}
      />
      {editHolding && (
        <HoldingForm
          holding={editHolding}
          accountId={account.id}
          currency={account.currency}
          open={!!editHolding}
          onOpenChange={(open) => !open && setEditHolding(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
