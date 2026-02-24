"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Account, CURRENCY_SYMBOLS } from "@/lib/types";

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
            <Label>账户总额 ({CURRENCY_SYMBOLS[currency]})</Label>
            <Input
              type="number"
              value={totalBalance}
              onChange={(e) => setTotalBalance(e.target.value)}
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

interface AccountCardProps {
  account: Account;
  onRefresh: () => void;
  onSelect: (account: Account) => void;
}

function AccountCard({ account, onRefresh, onSelect }: AccountCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const sym = CURRENCY_SYMBOLS[account.currency];

  const handleDelete = async () => {
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div
      className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => onSelect(account)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{account.currency}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{sym}{account.totalBalance.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            现金: {sym}{account.cash.toLocaleString()} · {account.holdingsCount} 个持仓
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          编辑
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              删除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                将同时删除"{account.name}"下的所有持仓，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <AccountForm
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onRefresh}
      />
    </div>
  );
}

interface AccountListProps {
  accounts: Account[];
  onRefresh: () => void;
  onSelectAccount: (account: Account) => void;
}

export function AccountList({ accounts, onRefresh, onSelectAccount }: AccountListProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">账户列表</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 添加账户
        </Button>
      </div>
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">暂无账户，点击上方添加</p>
      ) : (
        accounts.map((a) => (
          <AccountCard key={a.id} account={a} onRefresh={onRefresh} onSelect={onSelectAccount} />
        ))
      )}
      <AccountForm open={createOpen} onOpenChange={setCreateOpen} onSaved={onRefresh} />
    </div>
  );
}
