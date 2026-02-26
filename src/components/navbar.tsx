"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AssetClassSettings } from "@/components/asset-class-settings";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";
  const navItems = [
    { href: "/", label: "总览" },
    { href: "/market", label: "市场" },
    { href: "/accounts", label: "账户" },
    { href: "/transactions", label: "交易" },
    { href: "/snapshots", label: "快照" },
    { href: "/batch-update", label: "股价更新" },
    ...(isAdmin ? [{ href: "/admin", label: "管理" }] : []),
  ];

  const displayName = session?.user?.name || session?.user?.email || "用户";

  return (
    <>
      <nav className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-12">
          <div className="flex items-center gap-1">
            <span className="font-semibold mr-3">📊 资产管理</span>
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="text-sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {session?.user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={displayName}
                    className="h-6 w-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate">{displayName}</span>
              </div>
            )}
            {session?.user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                登出
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙️
            </Button>
          </div>
        </div>
      </nav>
      <AssetClassSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => {}}
      />
    </>
  );
}
