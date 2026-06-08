"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { AssetClassSettings } from "@/components/asset-class-settings";
import { DisciplineNotesFab } from "@/components/discipline-notes-fab";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { clearCurrentUserClientCache } from "@/lib/cache/provider";
import { cn } from "@/lib/utils/utils";

interface AppShellProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  const isAdmin = session?.user?.role === "admin";
  const navItems = [
    { href: "/", label: "总览" },
    { href: "/insights", label: "洞察" },
    { href: "/accounts", label: "账户" },
    { href: "/transactions", label: "活动" },
    { href: "/netvalue", label: "净值" },
    ...(isAdmin ? [{ href: "/admin", label: "管理" }] : []),
  ];

  const displayName = session?.user?.name || session?.user?.email || "用户";
  const userId = session?.user?.id;

  const handleSignOut = async () => {
    await clearCurrentUserClientCache(userId);
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const navList = (
    <nav className="flex flex-col gap-1" aria-label="主导航">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-5 py-5">
          <Link href="/" className="block text-base font-semibold text-foreground">
            SteadyFlow
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between px-3 py-4">
          {navList}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="w-full justify-start px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              设置
            </Button>
            {session?.user && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="truncate text-xs text-muted-foreground">{displayName}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="mt-2 h-7 w-full justify-start px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  登出
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="font-semibold text-foreground">
          SteadyFlow
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
          className="text-foreground hover:bg-muted"
        >
          <MenuIcon className="size-5" />
        </Button>
      </header>

      <main className="min-h-screen min-w-0 md:pl-56">{children}</main>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 border-border bg-background p-0 text-foreground">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="text-left text-base text-foreground">SteadyFlow</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100dvh-57px)] flex-col justify-between px-3 py-4">
            {navList}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="w-full justify-start px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                设置
              </Button>
              {session?.user && (
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSignOut()}
                    className="w-full justify-start px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    登出
                  </Button>
                </SheetClose>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AssetClassSettings open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={() => {}} />
      {!mobileMenuOpen ? <DisciplineNotesFab /> : null}
    </div>
  );
}
