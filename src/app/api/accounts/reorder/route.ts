import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser } from "@/lib/auth/auth-utils";

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { accountIds } = body as { accountIds?: number[] };

  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    return NextResponse.json({ error: "accountIds 不能为空" }, { status: 400 });
  }

  const normalizedIds = accountIds.map((id) => Number(id));
  if (normalizedIds.some((id) => !Number.isFinite(id))) {
    return NextResponse.json({ error: "accountIds 存在无效值" }, { status: 400 });
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return NextResponse.json({ error: "accountIds 不能重复" }, { status: 400 });
  }

  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const allIds = userAccounts.map((account: { id: number }) => account.id);

  if (allIds.length !== normalizedIds.length) {
    return NextResponse.json({ error: "排序列表必须包含当前用户全部账户" }, { status: 400 });
  }

  const allIdSet = new Set(allIds);
  if (normalizedIds.some((id) => !allIdSet.has(id))) {
    return NextResponse.json({ error: "排序列表包含无效账户" }, { status: 400 });
  }

  const now = new Date().toISOString();
  for (let index = 0; index < normalizedIds.length; index += 1) {
    const id = normalizedIds[index];
    await db
      .update(accounts)
      .set({
        sortOrder: index + 1,
        updatedAt: now,
      })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  }

  return NextResponse.json({ success: true });
}
