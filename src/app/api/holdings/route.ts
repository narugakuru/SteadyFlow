import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings, assetClasses } from "@/db/schema";

function getValidAssetClasses(): string[] {
  return db
    .select({ name: assetClasses.name })
    .from(assetClasses)
    .all()
    .map((r) => r.name)
    .filter((n) => n !== "现金");
}

export async function GET() {
  const rows = db.select().from(holdings).all();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, name, cost, marketValue, assetClass } = body;

  if (!accountId || !name || cost == null || !assetClass) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validClasses = getValidAssetClasses();
  if (!validClasses.includes(assetClass)) {
    return NextResponse.json({ error: "无效的资产类别" }, { status: 400 });
  }

  const finalCost = parseFloat(cost) || 0;
  const finalMarketValue = marketValue != null ? parseFloat(marketValue) : finalCost;

  const result = db
    .insert(holdings)
    .values({ accountId, name, cost: finalCost, marketValue: finalMarketValue, assetClass })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
