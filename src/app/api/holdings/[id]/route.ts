import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";

async function getValidAssetClasses(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: assetClasses.name })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId));
  return rows.map((r: any) => r.name).filter((n: string) => n !== "现金");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [holding] = await db.select().from(holdings).where(eq(holdings.id, numId));
  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, holding.accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  return NextResponse.json(holding);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const body = await request.json();
  const { name, ticker, valuationMode, cost, marketValue, shares, price, assetClass } = body;

  if (assetClass !== undefined) {
    const validClasses = await getValidAssetClasses(userId);
    if (!validClasses.includes(assetClass)) {
      return NextResponse.json({ error: "无效的资产类别" }, { status: 400 });
    }
  }

  // Build update set
  const updateSet: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };
  if (name !== undefined) updateSet.name = name;
  if (ticker !== undefined) updateSet.ticker = ticker || null;
  if (valuationMode !== undefined) updateSet.valuationMode = valuationMode;
  if (cost !== undefined) updateSet.cost = parseFloat(cost);
  if (assetClass !== undefined) updateSet.assetClass = assetClass;

  // For shares mode: if shares or price updated, recalculate marketValue
  if (shares !== undefined) updateSet.shares = parseFloat(shares);
  if (price !== undefined) updateSet.price = parseFloat(price);

  // Get current holding to determine mode for auto-calc
  const [current] = await db.select().from(holdings).where(eq(holdings.id, Number(id)));
  if (!current) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, current.accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const effectiveMode = valuationMode ?? current.valuationMode;
  if (effectiveMode === "shares") {
    const effectiveShares = shares !== undefined ? parseFloat(shares) : current.shares;
    const effectivePrice = price !== undefined ? parseFloat(price) : current.price;
    updateSet.marketValue = effectiveShares * effectivePrice;
  } else if (marketValue !== undefined) {
    updateSet.marketValue = parseFloat(marketValue);
  }

  const [result] = await db
    .update(holdings)
    .set(updateSet)
    .where(eq(holdings.id, Number(id)))
    .returning();

  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [holding] = await db.select().from(holdings).where(eq(holdings.id, numId));
  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, holding.accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  const [result] = await db
    .delete(holdings)
    .where(eq(holdings.id, numId))
    .returning();

  if (!result) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
