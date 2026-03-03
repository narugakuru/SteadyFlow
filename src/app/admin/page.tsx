"use client";

import Link from "next/link";

import { DataFreshness } from "@/components/data-freshness";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUserScopedQuery } from "@/lib/cache/hooks";

interface AdminStats {
  total: number;
  newToday: number;
  roles: Record<string, number>;
  plans: Record<string, number>;
}

export default function AdminPage() {
  const statsQuery = useUserScopedQuery<AdminStats>({
    name: "admin-stats",
    path: "/api/admin/stats",
  });

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading && !stats;
  const error = statsQuery.error instanceof Error ? statsQuery.error.message : "";

  if (loading) {
    return <LoadingSpinner text="加载中..." className="min-h-[50vh]" />;
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">{error || "加载失败"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">管理面板</h1>
        <Link href="/admin/users">
          <Button size="sm">用户管理</Button>
        </Link>
      </div>

      <DataFreshness updatedAt={statsQuery.dataUpdatedAt} isFetching={statsQuery.isFetching} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">用户总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">今日新增</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.newToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">角色分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">Admin: {stats.roles.admin ?? 0}</p>
            <p className="text-sm">User: {stats.roles.user ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">计划分布</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">Free: {stats.plans.free ?? 0}</p>
            <p className="text-sm">Pro: {stats.plans.pro ?? 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
