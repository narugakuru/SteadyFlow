import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db, isPostgres } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth/auth-utils";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";
import { roundForStorage } from "@/lib/utils/format";
import { calculateAccountTransfer } from "@/lib/utils/account-transfer";
import { toDbBool } from "@/lib/utils/utils";

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) return response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }

  const fromAccountId = Number(body.fromAccountId);
  const toAccountId = Number(body.toAccountId);
  const date = typeof body.date === "string" ? body.date : "";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!Number.isInteger(fromAccountId) || !Number.isInteger(toAccountId) || !date) {
    return NextResponse.json({ error: "请完整填写互转信息" }, { status: 400 });
  }
  if (fromAccountId === toAccountId) {
    return NextResponse.json({ error: "转出账户和转入账户不能相同" }, { status: 400 });
  }
  const ownedAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, [fromAccountId, toAccountId])));
  if (ownedAccounts.length !== 2) {
    return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  }

  const fromAccount = ownedAccounts.find((account: { id: number }) => account.id === fromAccountId);
  const toAccount = ownedAccounts.find((account: { id: number }) => account.id === toAccountId);
  if (!fromAccount || !toAccount) {
    return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  }

  let transferPlan;
  try {
    transferPlan = calculateAccountTransfer(
      fromAccount.currency,
      toAccount.currency,
      body.fromAmount,
      body.toAmount
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "互转金额无效" },
      { status: 400 }
    );
  }
  const { fromAmount, toAmount, fromDelta, toDelta } = transferPlan;
  const transferGroupId = randomUUID();
  const now = new Date().toISOString();
  const fromValues = {
    accountId: fromAccountId,
    holdingId: null,
    type: "transfer_out",
    transferGroupId,
    counterpartyAccountId: toAccountId,
    date,
    amount: fromAmount,
    realizedPnl: 0,
    cashDelta: fromDelta,
    principalDelta: fromDelta,
    holdingSharesDelta: 0,
    holdingCostDelta: 0,
    holdingMarketValueDelta: 0,
    shares: null,
    price: null,
    fee: 0,
    affectCash: toDbBool(true),
    affectHolding: toDbBool(false),
    note,
  };
  const toValues = {
    ...fromValues,
    accountId: toAccountId,
    type: "transfer_in",
    counterpartyAccountId: fromAccountId,
    amount: toAmount,
    cashDelta: toDelta,
    principalDelta: toDelta,
  };

  return runMutationWithNetvalue(userId, async () => {
    let created;
    if (isPostgres) {
      const results = await db.batch([
        db.insert(transactions).values(fromValues).returning(),
        db.insert(transactions).values(toValues).returning(),
        db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(fromAccount.cashBalance + fromDelta, "amount"),
            principal: roundForStorage(fromAccount.principal + fromDelta, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, fromAccountId)),
        db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(toAccount.cashBalance + toDelta, "amount"),
            principal: roundForStorage(toAccount.principal + toDelta, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, toAccountId)),
      ]);
      created = [results[0][0], results[1][0]];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      created = await db.transaction(async (tx: any) => {
        const [outRecord] = await tx.insert(transactions).values(fromValues).returning();
        const [inRecord] = await tx.insert(transactions).values(toValues).returning();
        await tx
          .update(accounts)
          .set({
            cashBalance: roundForStorage(fromAccount.cashBalance + fromDelta, "amount"),
            principal: roundForStorage(fromAccount.principal + fromDelta, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, fromAccountId));
        await tx
          .update(accounts)
          .set({
            cashBalance: roundForStorage(toAccount.cashBalance + toDelta, "amount"),
            principal: roundForStorage(toAccount.principal + toDelta, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, toAccountId));
        return [outRecord, inRecord];
      });
    }

    return NextResponse.json({ transferGroupId, transactions: created }, { status: 201 });
  });
}
