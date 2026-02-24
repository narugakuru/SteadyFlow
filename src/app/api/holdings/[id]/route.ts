import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, marketValue, assetClass } = body;

  const result = db
    .update(holdings)
    .set({
      ...(name !== undefined && { name }),
      ...(marketValue !== undefined && { marketValue }),
      ...(assetClass !== undefined && { assetClass }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(holdings.id, Number(id)))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = db
    .delete(holdings)
    .where(eq(holdings.id, Number(id)))
    .returning()
    .get();

  if (!result) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
