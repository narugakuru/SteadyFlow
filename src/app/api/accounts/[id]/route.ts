import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, currency, cashBalance } = body;

  const [result] = await db
    .update(accounts)
    .set({
      ...(name !== undefined && { name }),
      ...(currency !== undefined && { currency }),
      ...(cashBalance !== undefined && { cashBalance: parseFloat(cashBalance) }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accounts.id, Number(id)))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);

  // Manually delete transactions (cascade handles holdings)
  await db.delete(transactions).where(eq(transactions.accountId, numId));

  const [result] = await db
    .delete(accounts)
    .where(eq(accounts.id, numId))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
