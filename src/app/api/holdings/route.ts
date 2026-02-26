import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings, assetClasses } from "@/db/schema";

async function getValidAssetClasses(): Promise<string[]> {
  const rows = await db
    .select({ name: assetClasses.name })
    .from(assetClasses);
  return rows.map((r) => r.name).filter((n) => n !== "现金");
}

export async function GET() {
  const rows = await db.select().from(holdings);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, name, ticker, valuationMode = "amount", cost, marketValue, shares: inputShares, price: inputPrice, assetClass } = body;

  if (!accountId || !name || !assetClass) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validClasses = await getValidAssetClasses();
  if (!validClasses.includes(assetClass)) {
    return NextResponse.json({ error: "无效的资产类别" }, { status: 400 });
  }

  const finalCost = parseFloat(cost) || 0;
  const finalShares = parseFloat(inputShares) || 0;
  const finalPrice = parseFloat(inputPrice) || 0;
  const finalMarketValue = valuationMode === "shares"
    ? finalShares * finalPrice
    : (marketValue != null ? parseFloat(marketValue) : finalCost);

  const [result] = await db
    .insert(holdings)
    .values({
      accountId,
      name,
      ticker: ticker || null,
      valuationMode,
      cost: finalCost,
      marketValue: finalMarketValue,
      shares: finalShares,
      price: finalPrice,
      assetClass,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
