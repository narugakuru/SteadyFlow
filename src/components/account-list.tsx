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
import { Account, CURRENCY_SYMBOLS, pnlColorClass } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

interface AccountFormProps {
  account?: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function AccountForm({ account, open, onOpenChange, onSaved }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? "");
  const [currency, setCurrency] = useState<string>(account?.currency ?? "CNY");
  const [totalBalance, setTotalBalance] = useState(
    account?.totalBalance?.toString() ?? ""
  );
  const [totalCost, setTotalCost] = useState(
    account?.totalCost?.toString() ?? "0"
  );
  const [saving, setSaving] = useState(false);
  const isEdit = !!account;

  const handleSubmit = async () => {
    setSaving(true);
    const url = isEdit ? `/api/accounts/${account.id}` : "/api/accounts";
    await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        currency,
        totalBalance: parseFloat(totalBalance) || 0,
        totalCost: parseFloat(totalCost) || 0,
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
          <DialogTitle>{isEdit ? "编辑账户" : "添加账户"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>账户名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：A股券商" />
          </div>
          <div>
            <Label>币种</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CNY">CNY (人民币)</SelectItem>
                <SelectItem value="USD">USD (美元)</SelectItem>
                <SelectItem value="HKD">HKD (港币)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>账户市值/总额 ({CURRENCY_SYMBOLS[currency]})</Label>
            <Input
              type="number"
              value={totalBalance}
              onChange={(e) => setTotalBalance(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>账户本金 ({CURRENCY_SYMBOLS[currency]})（选填）</Label>
            <Input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !name} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AccountListProps {
  accounts: Account[];
  colorMode: "cn" | "us";
  onRefresh: () => void;
  onSelectAccount: (account: Account) => void;
}

export function AccountList({ accounts, colorMode, onRefresh, onSelectAccount }: AccountListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const handleDelete = async (id: number) => {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">账户列表</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 添加账户
        </Button>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无账户，点击上方添加</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">账户</th>
                <th className="text-right p-3 font-medium">市值</th>
                <th className="text-right p-3 font-medium">本金</th>
                <th className="text-right p-3 font-medium">盈亏</th>
                <th className="text-right p-3 font-medium">现金</th>
                <th className="text-right p-3 font-medium">持仓数</th>
                <th className="text-center p-3 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const sym = CURRENCY_SYMBOLS[a.currency];
                const pnl = a.totalCost > 0 ? a.totalBalance - a.totalCost : 0;
                const pnlPct = a.totalCost > 0 ? ((pnl / a.totalCost) * 100).toFixed(2) : null;
                return (
                  <tr
                    key={a.id}
                    className="border-t cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onSelectAccount(a)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name}</span>
                        <Badge variant="outline" className="text-xs">{a.currency}</Badge>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{sym}{a.totalBalance.toLocaleString()}</td>
                    <td className="p-3 text-right">{sym}{a.totalCost.toLocaleString()}</td>
                    <td className={`p-3 text-right ${a.totalCost > 0 ? pnlColorClass(pnl, colorMode) : "text-muted-foreground"}`}>
                      {a.totalCost > 0 ? (
                        <>
                          {pnl > 0 ? "+" : ""}{sym}{pnl.toLocaleString()}
                          {pnlPct && <span className="text-xs ml-1">({pnl > 0 ? "+" : ""}{pnlPct}%)</span>}
                        </>
                      ) : "--"}
                    </td>
                    <td className="p-3 text-right">{sym}{a.cash.toLocaleString()}</td>
                    <td className="p-3 text-right">{a.holdingsCount}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditAccount(a)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                将同时删除"{a.name}"下的所有持仓和交易记录，此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(a.id)}>确认删除</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <AccountForm open={createOpen} onOpenChange={setCreateOpen} onSaved={onRefresh} />
      {editAccount && (
        <AccountForm
          account={editAccount}
          open={!!editAccount}
          onOpenChange={(open) => !open && setEditAccount(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
