import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, transactions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { fromDbBool } from "@/lib/utils/utils";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [row] = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      holdingId: transactions.holdingId,
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
      realizedPnl: transactions.realizedPnl,
      shares: transactions.shares,
      price: transactions.price,
      fee: transactions.fee,
      affectCash: transactions.affectCash,
      affectHolding: transactions.affectHolding,
      note: transactions.note,
      createdAt: transactions.createdAt,
      accountName: accounts.name,
      accountCurrency: accounts.currency,
      holdingName: holdings.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(and(eq(transactions.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...row,
    affectCash: fromDbBool(row.affectCash),
    affectHolding: fromDbBool(row.affectHolding),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [existing] = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      realizedPnl: transactions.realizedPnl,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return runMutationWithNetvalue(userId, async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx.delete(transactions).where(eq(transactions.id, numId));
      if (existing.realizedPnl !== 0) {
        await tx
          .update(accounts)
          .set({
            realizedPnl: sql`${accounts.realizedPnl} - ${existing.realizedPnl}`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(accounts.id, existing.accountId));
      }
    });
    return NextResponse.json({ success: true });
  });
}
