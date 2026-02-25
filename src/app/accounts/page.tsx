"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AccountList } from "@/components/account-list";
import { HoldingsPanel } from "@/components/holdings-panel";
import { Account, AllocationData } from "@/lib/types";

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlHandled, setUrlHandled] = useState(false);

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
    return accData as Account[];
  }, []);

  useEffect(() => {
    fetchAll().then((accData) => {
      // Auto-select account from URL param
      if (!urlHandled) {
        const accountIdParam = searchParams.get("accountId");
        if (accountIdParam) {
          const target = accData.find((a: Account) => a.id === Number(accountIdParam));
          if (target) setSelectedAccount(target);
        }
        setUrlHandled(true);
      }
    });
  }, [fetchAll, searchParams, urlHandled]);

  if (loading || !allocation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const rates = allocation.rates.rates;

  if (selectedAccount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <HoldingsPanel
          account={selectedAccount}
          totalAssetCny={allocation.totalAssetCny}
          rates={rates}
          colorMode={allocation.settings.colorMode}
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
    <div className="max-w-4xl mx-auto p-6">
      <AccountList
        accounts={accounts}
        colorMode={allocation.settings.colorMode}
        onRefresh={fetchAll}
        onSelectAccount={setSelectedAccount}
      />
    </div>
  );
}
