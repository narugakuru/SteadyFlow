"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetClassSettings } from "@/components/asset-class-settings";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 flex items-center justify-between h-12">
          {/* Logo */}
          <span className="font-semibold shrink-0">📊 资产管理</span>

          {/* Desktop nav items */}
          <div className="hidden md:flex items-center gap-1 ml-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  className="text-sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
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
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
                登出
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              ⚙️
            </Button>
          </div>

          {/* Mobile: settings + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              ⚙️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开菜单"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-base">📊 资产管理</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col py-2">
            {navItems.map((item) => (
              <SheetClose key={item.href} asChild>
                <Link
                  href={item.href}
                  className={`px-4 py-3 text-sm transition-colors ${
                    isActive(item.href) ? "bg-secondary font-medium" : "hover:bg-accent/50"
                  }`}
                >
                  {item.label}
                </Link>
              </SheetClose>
            ))}
          </div>
          {session?.user && (
            <div className="mt-auto border-t px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
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
                <span className="truncate">{displayName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                登出
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AssetClassSettings open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={() => {}} />
    </>
  );
}
