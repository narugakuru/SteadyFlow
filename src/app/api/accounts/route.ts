import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { roundForStorage } from "@/lib/utils/format";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      currency: accounts.currency,
      cashBalance: accounts.cashBalance,
      principal: accounts.principal,
      realizedPnl: accounts.realizedPnl,
      sortOrder: accounts.sortOrder,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      holdingsValue: sql<number>`coalesce(sum(${holdings.marketValue}), 0)`,
      holdingsPnl: sql<number>`coalesce(sum(${holdings.marketValue} - CASE WHEN ${holdings.valuationMode} = 'shares' THEN ${holdings.cost} * ${holdings.shares} ELSE ${holdings.cost} END), 0)`,
      holdingsCount: sql<number>`count(${holdings.id})`,
    })
    .from(accounts)
    .leftJoin(holdings, eq(accounts.id, holdings.accountId))
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id);

  type AccountListRow = (typeof rows)[number] & { accountValue: number };

  const result: AccountListRow[] = rows.map((row: (typeof rows)[number]) => ({
    ...row,
    accountValue: roundForStorage(row.cashBalance + row.holdingsValue, "amount"),
  }));
  result.sort(
    (left: AccountListRow, right: AccountListRow) =>
      left.sortOrder - right.sortOrder || left.id - right.id
  );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { name, currency, cashBalance, principal } = body;

  if (!name || !currency || cashBalance == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cashVal = roundForStorage(parseFloat(cashBalance) || 0, "amount");
  const principalVal = roundForStorage(
    principal == null ? cashVal : parseFloat(principal) || 0,
    "amount"
  );
  const [lastAccount] = await db
    .select({ sortOrder: accounts.sortOrder })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(desc(accounts.sortOrder), desc(accounts.id))
    .limit(1);
  const nextSortOrder = (lastAccount?.sortOrder ?? 0) + 1;

  return runMutationWithNetvalue(userId, async () => {
    const [result] = await db
      .insert(accounts)
      .values({
        userId,
        name,
        currency,
        cashBalance: cashVal,
        principal: principalVal,
        sortOrder: nextSortOrder,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  });
}
