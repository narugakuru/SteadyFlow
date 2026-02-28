import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses } from "@/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { normalizeAssetClassName } from "@/lib/asset-class";
import { roundForStorage } from "@/lib/format";

async function getValidAssetClasses(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: assetClasses.name })
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId));
  return Array.from(
    new Set(
      rows
        .map((r: (typeof rows)[number]) => normalizeAssetClassName(r.name))
        .filter((n: string) => n !== "现金")
    )
  );
}

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const accountRows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const accountIds = accountRows.map((row: (typeof accountRows)[number]) => row.id);

  const rows = accountIds.length
    ? await db
        .select()
        .from(holdings)
        .where(inArray(holdings.accountId, accountIds))
        .orderBy(asc(holdings.accountId), asc(holdings.sortOrder), asc(holdings.id))
    : [];
  return NextResponse.json(
    rows.map((row: (typeof rows)[number]) => ({
      ...row,
      assetClass: normalizeAssetClassName(row.assetClass),
    }))
  );
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const {
    accountId,
    name,
    ticker,
    valuationMode = "amount",
    cost,
    marketValue,
    shares: inputShares,
    price: inputPrice,
    assetClass,
    memo,
  } = body;

  if (!accountId || !name || !assetClass) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const normalizedAssetClass = normalizeAssetClassName(String(assetClass));

  const accountIdNum = Number(accountId);
  if (!Number.isFinite(accountIdNum)) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }

  const memoText = typeof memo === "string" ? memo.trim() : "";
  if (memoText.length > 2000) {
    return NextResponse.json({ error: "memo 不能超过 2000 字符" }, { status: 400 });
  }

  const validClasses = await getValidAssetClasses(userId);
  if (!validClasses.includes(normalizedAssetClass)) {
    return NextResponse.json({ error: "无效的资产类别" }, { status: 400 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountIdNum), eq(accounts.userId, userId)))
    .limit(1);
  if (!account) {
    return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  }
  const [lastHolding] = await db
    .select({ sortOrder: holdings.sortOrder })
    .from(holdings)
    .where(eq(holdings.accountId, accountIdNum))
    .orderBy(desc(holdings.sortOrder), desc(holdings.id))
    .limit(1);
  const nextSortOrder = (lastHolding?.sortOrder ?? 0) + 1;

  const finalCost = roundForStorage(parseFloat(cost) || 0, "amount");
  const finalShares = roundForStorage(parseFloat(inputShares) || 0, "shares");
  const finalPrice = roundForStorage(parseFloat(inputPrice) || 0, "price");
  const finalMarketValue =
    valuationMode === "shares"
      ? roundForStorage(finalShares * finalPrice, "amount")
      : roundForStorage(marketValue != null ? parseFloat(marketValue) : finalCost, "amount");

  const [result] = await db
    .insert(holdings)
    .values({
      accountId: accountIdNum,
      name,
      ticker: ticker || null,
      valuationMode,
      cost: finalCost,
      marketValue: finalMarketValue,
      shares: finalShares,
      price: finalPrice,
      assetClass: normalizedAssetClass,
      sortOrder: nextSortOrder,
      memo: memoText || null,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
