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
      totalBalance: accounts.totalBalance,
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
    cash: Math.max(0, row.totalBalance - row.holdingsValue),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, currency, totalBalance } = body;

  if (!name || !currency || totalBalance == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = db
    .insert(accounts)
    .values({ name, currency, totalBalance })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
