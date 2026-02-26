import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings } from "@/db/schema";
import { eq } from "drizzle-orm";

interface BatchPayload {
  holdings?: { id: number; marketValue: number }[];
}

export async function PUT(request: Request) {
  const body = (await request.json()) as BatchPayload;

  const holdingUpdates = body.holdings ?? [];

  if (holdingUpdates.length === 0) {
    return NextResponse.json({ error: "没有需要更新的数据" }, { status: 400 });
  }

  const now = new Date().toISOString();

  for (const h of holdingUpdates) {
    await db.update(holdings)
      .set({ marketValue: h.marketValue, updatedAt: now })
      .where(eq(holdings.id, h.id));
  }

  return NextResponse.json({
    success: true,
    updated: {
      holdings: holdingUpdates.length,
    },
  });
}
