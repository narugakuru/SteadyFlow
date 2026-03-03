"use client";

import { SessionProvider } from "next-auth/react";

import { CacheSyncBanner } from "@/components/cache-sync-banner";
import { AppQueryProvider } from "@/lib/cache/provider";

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppQueryProvider>
        {children}
        <CacheSyncBanner />
      </AppQueryProvider>
    </SessionProvider>
  );
}
