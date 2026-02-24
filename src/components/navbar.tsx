"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssetClassSettings } from "@/components/asset-class-settings";

const navItems = [
  { href: "/", label: "总览" },
  { href: "/accounts", label: "账户" },
  { href: "/transactions", label: "交易" },
  { href: "/snapshots", label: "快照" },
  { href: "/batch-update", label: "股价更新" },
];

export function Navbar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙️
          </Button>
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
