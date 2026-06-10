import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { roundForStorage } from "@/lib/utils/format";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const body = await request.json();
  const { name, currency, cashBalance, principal } = body;

  return runMutationWithNetvalue(userId, async () => {
    const [result] = await db
      .update(accounts)
      .set({
        ...(name !== undefined && { name }),
        ...(currency !== undefined && { currency }),
        ...(cashBalance !== undefined && {
          cashBalance: roundForStorage(parseFloat(cashBalance) || 0, "amount"),
        }),
        ...(principal !== undefined && {
          principal: roundForStorage(parseFloat(principal) || 0, "amount"),
        }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(accounts.id, Number(id)), eq(accounts.userId, userId)))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return runMutationWithNetvalue(userId, async () => {
    // Manually delete transactions (cascade handles holdings)
    await db.delete(transactions).where(eq(transactions.accountId, numId));

    const [result] = await db
      .delete(accounts)
      .where(and(eq(accounts.id, numId), eq(accounts.userId, userId)))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  });
}
