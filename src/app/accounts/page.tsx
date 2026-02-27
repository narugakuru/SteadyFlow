"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountList } from "@/components/account-list";
import { Account, AllocationData } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function isAllocationData(value: unknown): value is AllocationData {
  if (!value || typeof value !== "object") return false;
  const v = value as AllocationData;
  return !!v.rates && !!v.rates.rates && Array.isArray(v.allocation) && !!v.settings;
}

function AccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const defaultExpandId = searchParams.get("accountId")
    ? Number(searchParams.get("accountId"))
    : undefined;

  const fetchAll = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      setError("");
      try {
        const [accRes, allocRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/asset-allocation"),
        ]);
        const [accData, allocData]: [unknown, unknown] = await Promise.all([
          accRes.json().catch(() => null),
          allocRes.json().catch(() => null),
        ]);

        if (accRes.status === 401 || allocRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (!accRes.ok) {
          const message =
            accData && typeof accData === "object" && "error" in accData
              ? String(accData.error)
              : "加载账户失败";
          throw new Error(message);
        }
        if (!allocRes.ok) {
          const message =
            allocData && typeof allocData === "object" && "error" in allocData
              ? String(allocData.error)
              : "加载资产配置失败";
          throw new Error(message);
        }
        if (!Array.isArray(accData)) {
          throw new Error("账户数据格式异常");
        }
        if (!isAllocationData(allocData)) {
          throw new Error("资产配置数据格式异常");
        }

        setAccounts(accData as Account[]);
        setAllocation(allocData);
      } catch (err) {
        setAccounts([]);
        setAllocation(null);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

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
            <Button variant="outline" size="sm" onClick={() => fetchAll(true)}>
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rates = allocation.rates.rates;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <AccountList
        accounts={accounts}
        totalAssetCny={allocation.totalAssetCny}
        rates={rates}
        colorMode={allocation.settings.colorMode}
        defaultExpandId={defaultExpandId}
        onRefresh={() => fetchAll()}
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
