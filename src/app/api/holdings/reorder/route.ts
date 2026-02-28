import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { accountId, holdingIds } = body as {
    accountId: number;
    holdingIds: number[];
  };

  const accountIdNum = Number(accountId);
  if (!Number.isFinite(accountIdNum)) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }
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
        sortOrder: index + 1,
        updatedAt: now,
      })
      .where(and(eq(holdings.id, id), eq(holdings.accountId, accountIdNum)));
  }

  return NextResponse.json({ success: true });
}
