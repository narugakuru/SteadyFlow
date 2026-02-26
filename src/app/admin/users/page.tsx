"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
  plan: "free" | "pro";
  createdAt: string;
  loginMethods: string[];
}

const ROLE_OPTIONS = ["admin", "user"] as const;
const PLAN_OPTIONS = ["free", "pro"] as const;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const currentUserId = session?.user?.id;

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        setError("无法获取用户列表");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const updateUser = async (id: string, updates: Partial<Pick<AdminUser, "role" | "plan">>) => {
    setSavingId(id);
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "更新失败");
      setSavingId(null);
      return;
    }

    const updated = await res.json();
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...updated } : user)));
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          刷新
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>计划</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead>登录方式</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = currentUserId === user.id;
            return (
              <TableRow key={user.id}>
                <TableCell>{user.name || "-"}</TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={user.role}
                    disabled={isSelf || savingId === user.id}
                    onChange={(event) => updateUser(user.id, { role: event.target.value as AdminUser["role"] })}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={user.plan}
                    disabled={savingId === user.id}
                    onChange={(event) => updateUser(user.id, { plan: event.target.value as AdminUser["plan"] })}
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</TableCell>
                <TableCell>
                  {user.loginMethods.length > 0
                    ? user.loginMethods.map((method) => (method === "password" ? "密码" : "GitHub")).join(" / ")
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
