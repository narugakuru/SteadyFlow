"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { AccountList } from "@/components/account-list";
import { DataFreshness } from "@/components/data-freshness";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUserScopedQuery } from "@/lib/cache/hooks";
import { Account, AllocationData } from "@/lib/types";

function AccountsContent() {
  const searchParams = useSearchParams();
  const defaultExpandId = searchParams.get("accountId")
    ? Number(searchParams.get("accountId"))
    : undefined;

  const accountsQuery = useUserScopedQuery<Account[]>({
    name: "accounts",
    path: "/api/accounts",
  });

  const allocationQuery = useUserScopedQuery<AllocationData>({
    name: "asset-allocation",
    path: "/api/asset-allocation",
  });

  const accounts = accountsQuery.data ?? [];
  const allocation = allocationQuery.data;

  const loading =
    (accountsQuery.isLoading && accounts.length === 0) ||
    (allocationQuery.isLoading && !allocation);
  const errorQuery = accountsQuery.error ?? allocationQuery.error;
  const error = errorQuery instanceof Error ? errorQuery.message : "";

  const refreshAll = async () => {
    await Promise.all([accountsQuery.refetch(), allocationQuery.refetch()]);
  };

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-[50vh]" />;
  }

  if (error || !allocation) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-destructive inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "加载失败"}
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={() => void refreshAll()}>
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <DataFreshness
        updatedAt={Math.max(accountsQuery.dataUpdatedAt || 0, allocationQuery.dataUpdatedAt || 0)}
        isFetching={accountsQuery.isFetching || allocationQuery.isFetching}
        className="mb-2"
      />
      <AccountList
        accounts={accounts}
        totalAssetCny={allocation.totalAssetCny}
        rates={allocation.rates.rates}
        colorMode={allocation.settings.colorMode}
        defaultExpandId={defaultExpandId}
        onRefresh={() => void refreshAll()}
      />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="加载中..." className="min-h-[50vh]" />}>
      <AccountsContent />
    </Suspense>
  );
}
