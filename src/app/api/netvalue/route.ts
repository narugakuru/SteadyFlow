/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { netvalue } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { normalizeAllocationSnapshot, recordTodayNetvalue } from "@/lib/netvalue-service";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db
    .select()
    .from(netvalue)
    .where(eq(netvalue.userId, userId))
    .orderBy(desc(netvalue.date));

  return NextResponse.json(
    rows.map((r: any) => ({
      ...r,
      dataJson: (() => {
        const parsed = JSON.parse(r.dataJson);
        if (!Array.isArray(parsed?.allocation)) return parsed;
        return {
          ...parsed,
          allocation: normalizeAllocationSnapshot(parsed.allocation),
        };
      })(),
    }))
  );
}

export async function POST() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const result = await recordTodayNetvalue(userId);
  return NextResponse.json(result);
}
