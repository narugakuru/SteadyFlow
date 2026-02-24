import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings, assetClasses } from "@/db/schema";
import { eq } from "drizzle-orm";

function getValidAssetClasses(): string[] {
  return db
    .select({ name: assetClasses.name })
    .from(assetClasses)
    .all()
    .map((r) => r.name)
    .filter((n) => n !== "现金");
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, cost, marketValue, assetClass } = body;

  if (assetClass !== undefined) {
    const validClasses = getValidAssetClasses();
    if (!validClasses.includes(assetClass)) {
      return NextResponse.json({ error: "无效的资产类别" }, { status: 400 });
    }
  }

  const result = db
    .update(holdings)
    .set({
      ...(name !== undefined && { name }),
      ...(cost !== undefined && { cost: parseFloat(cost) }),
      ...(marketValue !== undefined && { marketValue: parseFloat(marketValue) }),
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
