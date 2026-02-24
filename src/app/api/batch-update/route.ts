import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { eq } from "drizzle-orm";

interface BatchPayload {
  accounts?: { id: number; totalBalance: number }[];
  holdings?: { id: number; marketValue: number }[];
}

export async function PUT(request: Request) {
  const body = (await request.json()) as BatchPayload;

  const accountUpdates = body.accounts ?? [];
  const holdingUpdates = body.holdings ?? [];

  if (accountUpdates.length === 0 && holdingUpdates.length === 0) {
    return NextResponse.json({ error: "没有需要更新的数据" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Run all updates in a single transaction
  db.transaction((tx) => {
    for (const acc of accountUpdates) {
      tx.update(accounts)
        .set({ totalBalance: acc.totalBalance, updatedAt: now })
        .where(eq(accounts.id, acc.id))
        .run();
    }
    for (const h of holdingUpdates) {
      tx.update(holdings)
        .set({ marketValue: h.marketValue, updatedAt: now })
        .where(eq(holdings.id, h.id))
        .run();
    }
  });

  return NextResponse.json({
    success: true,
    updated: {
      accounts: accountUpdates.length,
      holdings: holdingUpdates.length,
    },
  });
}
