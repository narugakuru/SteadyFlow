"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AccountList } from "@/components/account-list";
import { Account, AllocationData } from "@/lib/types";

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultExpandId = searchParams.get("accountId")
    ? Number(searchParams.get("accountId"))
    : undefined;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [accRes, allocRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/asset-allocation"),
    ]);
    const [accData, allocData] = await Promise.all([
      accRes.json(),
      allocRes.json(),
    ]);
    setAccounts(accData);
    setAllocation(allocData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading || !allocation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const rates = allocation.rates.rates;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <AccountList
        accounts={accounts}
        totalAssetCny={allocation.totalAssetCny}
        rates={rates}
        colorMode={allocation.settings.colorMode}
        defaultExpandId={defaultExpandId}
        onRefresh={fetchAll}
      />
    </div>
  );
}
