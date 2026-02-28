import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { normalizeAssetClassName } from "@/lib/asset-class";

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { scope, accountId, assetClass, holdingIds } = body as {
    scope?: "account" | "discipline";
    accountId?: number;
    assetClass?: string;
    holdingIds: number[];
  };
  const mode: "account" | "discipline" =
    scope === "discipline" || (!accountId && assetClass) ? "discipline" : "account";

  if (!Array.isArray(holdingIds) || holdingIds.length === 0) {
    return NextResponse.json({ error: "holdingIds 不能为空" }, { status: 400 });
  }

  const normalizedIds = holdingIds.map((id) => Number(id));
  if (normalizedIds.some((id) => !Number.isFinite(id))) {
    return NextResponse.json({ error: "holdingIds 存在无效值" }, { status: 400 });
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return NextResponse.json({ error: "holdingIds 不能重复" }, { status: 400 });
  }

  if (mode === "account") {
    const accountIdNum = Number(accountId);
    if (!Number.isFinite(accountIdNum)) {
      return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
    }

    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountIdNum), eq(accounts.userId, userId)))
      .limit(1);
    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 });
    }

    const accountHoldings = await db
      .select({ id: holdings.id })
      .from(holdings)
      .where(eq(holdings.accountId, accountIdNum));
    const allIds = accountHoldings.map((holding: { id: number }) => holding.id);
    if (allIds.length !== normalizedIds.length) {
      return NextResponse.json({ error: "排序列表必须包含该账户全部持仓" }, { status: 400 });
    }
    const allSet = new Set(allIds);
    if (normalizedIds.some((id) => !allSet.has(id))) {
      return NextResponse.json({ error: "排序列表包含无效持仓" }, { status: 400 });
    }

    const now = new Date().toISOString();
    for (let index = 0; index < normalizedIds.length; index += 1) {
      const id = normalizedIds[index];
      await db
        .update(holdings)
        .set({
          accountSortOrder: index + 1,
          updatedAt: now,
        })
        .where(and(eq(holdings.id, id), eq(holdings.accountId, accountIdNum)));
    }

    return NextResponse.json({ success: true, scope: "account" });
  }

  if (!assetClass || !String(assetClass).trim()) {
    return NextResponse.json({ error: "assetClass 不能为空" }, { status: 400 });
  }

  const normalizedAssetClass = normalizeAssetClassName(String(assetClass));

  const targetRows = await db
    .select({
      id: holdings.id,
      assetClass: holdings.assetClass,
      accountId: holdings.accountId,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(and(eq(accounts.userId, userId), inArray(holdings.id, normalizedIds)));

  if (targetRows.length !== normalizedIds.length) {
    return NextResponse.json({ error: "排序列表包含无效持仓" }, { status: 400 });
  }

  const mixedClass = targetRows.some(
    (row: { assetClass: string }) =>
      normalizeAssetClassName(row.assetClass) !== normalizedAssetClass
  );
  if (mixedClass) {
    return NextResponse.json({ error: "排序列表存在非当前资产类别持仓" }, { status: 400 });
  }

  const classRows = await db
    .select({
      id: holdings.id,
      assetClass: holdings.assetClass,
    })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(eq(accounts.userId, userId));

  const allClassIds = classRows
    .filter(
      (row: { assetClass: string }) =>
        normalizeAssetClassName(row.assetClass) === normalizedAssetClass
    )
    .map((row: { id: number }) => row.id);

  if (allClassIds.length !== normalizedIds.length) {
    return NextResponse.json({ error: "排序列表必须包含该资产类别全部持仓" }, { status: 400 });
  }
  const classSet = new Set(allClassIds);
  if (normalizedIds.some((id) => !classSet.has(id))) {
    return NextResponse.json({ error: "排序列表包含非当前资产类别持仓" }, { status: 400 });
  }

  const now = new Date().toISOString();
  for (let index = 0; index < normalizedIds.length; index += 1) {
    const id = normalizedIds[index];
    await db
      .update(holdings)
      .set({
        disciplineSortOrder: index + 1,
        updatedAt: now,
      })
      .where(eq(holdings.id, id));
  }

  return NextResponse.json({ success: true, scope: "discipline" });
}
