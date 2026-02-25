import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = db
    .select({
      id: accounts.id,
      name: accounts.name,
      currency: accounts.currency,
      cashBalance: accounts.cashBalance,
      totalCost: accounts.totalCost,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      holdingsValue: sql<number>`coalesce(sum(${holdings.marketValue}), 0)`,
      holdingsCount: sql<number>`count(${holdings.id})`,
    })
    .from(accounts)
    .leftJoin(holdings, eq(accounts.id, holdings.accountId))
    .groupBy(accounts.id)
    .all();

  const result = rows.map((row) => ({
    ...row,
    accountValue: row.cashBalance + row.holdingsValue,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, currency, cashBalance, totalCost } = body;

  if (!name || !currency || cashBalance == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cashVal = parseFloat(cashBalance) || 0;

  const result = db
    .insert(accounts)
    .values({
      name,
      currency,
      cashBalance: cashVal,
      totalCost: totalCost != null ? parseFloat(totalCost) : cashVal,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
