import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { roundForStorage } from "@/lib/utils/format";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

interface BatchPayload {
  holdings?: { id: number; marketValue: number; price?: number }[];
}

async function handleBatchUpdate(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = (await request.json()) as BatchPayload;
  const holdingUpdates = body.holdings ?? [];

  if (holdingUpdates.length === 0) {
    return NextResponse.json({ error: "没有需要更新的数据" }, { status: 400 });
  }

  const holdingIds = [...new Set(holdingUpdates.map((h) => h.id))];
  const allowed = await db
    .select({ id: holdings.id })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), inArray(holdings.id, holdingIds)));

  if (allowed.length !== holdingIds.length) {
    return NextResponse.json({ error: "持仓不存在" }, { status: 404 });
  }

  return runMutationWithNetvalue(userId, async () => {
    const now = new Date().toISOString();

    for (const h of holdingUpdates) {
      const updateData: { marketValue: number; updatedAt: string; price?: number } = {
        marketValue: roundForStorage(h.marketValue, "amount"),
        updatedAt: now,
      };
      if (h.price !== undefined) {
        updateData.price = roundForStorage(h.price, "price");
      }
      await db.update(holdings).set(updateData).where(eq(holdings.id, h.id));
    }

    return NextResponse.json({
      success: true,
      updated: {
        holdings: holdingUpdates.length,
      },
    });
  });
}

export async function PUT(request: Request) {
  return handleBatchUpdate(request);
}

export async function POST(request: Request) {
  return handleBatchUpdate(request);
}
