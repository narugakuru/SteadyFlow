import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, currency, totalBalance } = body;

  const result = db
    .update(accounts)
    .set({
      ...(name !== undefined && { name }),
      ...(currency !== undefined && { currency }),
      ...(totalBalance !== undefined && { totalBalance }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(accounts.id, Number(id)))
    .returning()
    .get();

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

  // Holdings are cascade-deleted via foreign key
  const result = db
    .delete(accounts)
    .where(eq(accounts.id, Number(id)))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
