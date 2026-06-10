import { NextResponse } from "next/server";
import { db, isPostgres } from "@/db";
import { accounts, holdings, transactions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { fromDbBool } from "@/lib/utils/utils";
import { roundForStorage } from "@/lib/utils/format";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [row] = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      holdingId: transactions.holdingId,
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
      realizedPnl: transactions.realizedPnl,
      cashDelta: transactions.cashDelta,
      principalDelta: transactions.principalDelta,
      holdingSharesDelta: transactions.holdingSharesDelta,
      holdingCostDelta: transactions.holdingCostDelta,
      holdingMarketValueDelta: transactions.holdingMarketValueDelta,
      shares: transactions.shares,
      price: transactions.price,
      fee: transactions.fee,
      affectCash: transactions.affectCash,
      affectHolding: transactions.affectHolding,
      note: transactions.note,
      createdAt: transactions.createdAt,
      accountName: accounts.name,
      accountCurrency: accounts.currency,
      holdingName: holdings.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(and(eq(transactions.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...row,
    affectCash: fromDbBool(row.affectCash),
    affectHolding: fromDbBool(row.affectHolding),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { id } = await params;
  const numId = Number(id);

  const [existing] = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      holdingId: transactions.holdingId,
      type: transactions.type,
      realizedPnl: transactions.realizedPnl,
      cashDelta: transactions.cashDelta,
      principalDelta: transactions.principalDelta,
      holdingSharesDelta: transactions.holdingSharesDelta,
      holdingCostDelta: transactions.holdingCostDelta,
      holdingMarketValueDelta: transactions.holdingMarketValueDelta,
      accountCashBalance: accounts.cashBalance,
      accountPrincipal: accounts.principal,
      accountRealizedPnl: accounts.realizedPnl,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.id, numId), eq(accounts.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const nextCashBalance = roundForStorage(
    existing.accountCashBalance - existing.cashDelta,
    "amount"
  );
  const nextPrincipal = roundForStorage(
    existing.accountPrincipal - existing.principalDelta,
    "amount"
  );
  const nextRealizedPnl = roundForStorage(
    existing.accountRealizedPnl - existing.realizedPnl,
    "amount"
  );
  const shouldUpdateAccount =
    existing.cashDelta !== 0 || existing.principalDelta !== 0 || existing.realizedPnl !== 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let holdingUpdateSet: Record<string, any> | null = null;
  if (
    existing.holdingId &&
    (existing.holdingSharesDelta !== 0 ||
      existing.holdingCostDelta !== 0 ||
      existing.holdingMarketValueDelta !== 0)
  ) {
    const [holding] = await db
      .select()
      .from(holdings)
      .where(eq(holdings.id, existing.holdingId))
      .limit(1);

    if (!holding) {
      return NextResponse.json({ error: "关联持仓不存在，无法回滚交易" }, { status: 409 });
    }

    if (holding.valuationMode === "shares") {
      const currentCostBasis = roundForStorage(holding.cost * holding.shares, "amount");
      const nextShares = roundForStorage(holding.shares - existing.holdingSharesDelta, "shares");
      const nextCostBasis = roundForStorage(currentCostBasis - existing.holdingCostDelta, "amount");
      if (nextShares < 0 || nextCostBasis < 0) {
        return NextResponse.json(
          { error: "删除后持仓份额或成本会变为负数，已取消删除" },
          { status: 409 }
        );
      }

      const nextCost = nextShares > 0 ? roundForStorage(nextCostBasis / nextShares, "price") : 0;
      holdingUpdateSet = {
        shares: nextShares,
        cost: nextCost,
        marketValue: roundForStorage(nextShares * holding.price, "amount"),
        updatedAt: now,
      };
    } else {
      const nextCost = roundForStorage(holding.cost - existing.holdingCostDelta, "amount");
      const nextMarketValue = roundForStorage(
        holding.marketValue - existing.holdingMarketValueDelta,
        "amount"
      );
      if (nextCost < 0 || nextMarketValue < 0) {
        return NextResponse.json(
          { error: "删除后持仓成本或市值会变为负数，已取消删除" },
          { status: 409 }
        );
      }

      holdingUpdateSet = {
        cost: nextCost,
        marketValue: nextMarketValue,
        updatedAt: now,
      };
    }
  }

  return runMutationWithNetvalue(userId, async () => {
    if (isPostgres) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ops: any[] = [];
      if (holdingUpdateSet && existing.holdingId) {
        ops.push(
          db.update(holdings).set(holdingUpdateSet).where(eq(holdings.id, existing.holdingId))
        );
      }
      if (shouldUpdateAccount) {
        ops.push(
          db
            .update(accounts)
            .set({
              cashBalance: nextCashBalance,
              principal: nextPrincipal,
              realizedPnl: nextRealizedPnl,
              updatedAt: now,
            })
            .where(eq(accounts.id, existing.accountId))
        );
      }
      ops.push(db.delete(transactions).where(eq(transactions.id, numId)));
      await db.batch(ops);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        if (holdingUpdateSet && existing.holdingId) {
          await tx
            .update(holdings)
            .set(holdingUpdateSet)
            .where(eq(holdings.id, existing.holdingId));
        }
        if (shouldUpdateAccount) {
          await tx
            .update(accounts)
            .set({
              cashBalance: nextCashBalance,
              principal: nextPrincipal,
              realizedPnl: nextRealizedPnl,
              updatedAt: now,
            })
            .where(eq(accounts.id, existing.accountId));
        }
        await tx.delete(transactions).where(eq(transactions.id, numId));
      });
    }
    return NextResponse.json({ success: true });
  });
}
