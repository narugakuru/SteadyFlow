"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisciplineTable } from "@/components/discipline-table";
import { AccountList } from "@/components/account-list";
import { HoldingsPanel } from "@/components/holdings-panel";
import { PortfolioChart } from "@/components/portfolio-chart";
import { DeviationChart } from "@/components/deviation-chart";
import { AssetClassSettings } from "@/components/asset-class-settings";
import { Account, AllocationData } from "@/lib/types";
import Link from "next/link";

export default function Dashboard() {
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [allocRes, accRes] = await Promise.all([
      fetch("/api/asset-allocation"),
      fetch("/api/accounts"),
    ]);
    const [allocData, accData] = await Promise.all([
      allocRes.json(),
      accRes.json(),
    ]);
    setAllocation(allocData);
    setAccounts(accData);
    setLoading(false);
  }, []);

  // Auto-snapshot on load
  useEffect(() => {
    fetchAll().then(() => {
      fetch("/api/snapshots", { method: "POST" });
    });
  }, [fetchAll]);

  const handleRefreshSnapshot = async () => {
    await fetch("/api/snapshots", { method: "POST" });
  };

  if (loading || !allocation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const rates = allocation.rates.rates;

  // If viewing a specific account's holdings
  if (selectedAccount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <HoldingsPanel
          account={selectedAccount}
          totalAssetCny={allocation.totalAssetCny}
          rates={rates}
          onBack={() => {
            setSelectedAccount(null);
            fetchAll();
          }}
          onDataChange={fetchAll}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 资产组合管理</h1>
        <div className="flex gap-2">
          <Link href="/batch-update">
            <Button variant="outline" size="sm">✏️ 批量更新</Button>
          </Link>
          <Link href="/snapshots">
            <Button variant="outline" size="sm">📋 快照历史</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleRefreshSnapshot}>
            📸 刷新快照
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            ⚙️ 配置
          </Button>
        </div>
      </div>

      {/* Total Asset Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">总资产 (CNY)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">¥{allocation.totalAssetCny.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            汇率更新: {allocation.rates.updatedAt === "default" ? "使用默认汇率" : new Date(allocation.rates.updatedAt).toLocaleString()}
            {allocation.rates.source === "stale_cache" && " (缓存)"}
            {allocation.rates.source === "default" && " ⚠️"}
            {Object.entries(rates).map(([pair, rate]) => ` · ${pair}: ${rate}`).join("")}
          </p>
        </CardContent>
      </Card>

      {/* Portfolio Chart */}
      <PortfolioChart allocation={allocation.allocation} />

      {/* Discipline Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">资产配置纪律</h2>
        <DisciplineTable allocation={allocation.allocation} onDataChange={fetchAll} />
        <DeviationChart allocation={allocation.allocation} />
      </div>

      {/* Account List (no tabs) */}
      <AccountList
        accounts={accounts}
        onRefresh={fetchAll}
        onSelectAccount={setSelectedAccount}
      />

      {/* Settings Dialog */}
      <AssetClassSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={fetchAll}
      />
    </div>
  );
}
