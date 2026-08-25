import { NextResponse } from "next/server";
import { db, isPostgres } from "@/db";
import { transactions, holdings, accounts } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import { fromDbBool, toDbBool } from "@/lib/utils/utils";
import { roundForStorage } from "@/lib/utils/format";
import { calculateFeeRealizedPnl } from "@/lib/utils/account-principal";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";

type TransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "deposit"
  | "withdraw"
  | "fee"
  | "transfer_out"
  | "transfer_in";

const VALID_TRANSACTION_TYPES: TransactionType[] = [
  "buy",
  "sell",
  "dividend",
  "deposit",
  "withdraw",
  "fee",
  "transfer_out",
  "transfer_in",
];

export async function GET(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");

  const conditions = [eq(accounts.userId, userId)];
  if (accountId) conditions.push(eq(transactions.accountId, Number(accountId)));
  if (type === "transfer") {
    conditions.push(
      or(eq(transactions.type, "transfer_out"), eq(transactions.type, "transfer_in"))!
    );
  } else if (type && VALID_TRANSACTION_TYPES.includes(type as TransactionType)) {
    conditions.push(eq(transactions.type, type as TransactionType));
  }

  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      holdingId: transactions.holdingId,
      type: transactions.type,
      transferGroupId: transactions.transferGroupId,
      counterpartyAccountId: transactions.counterpartyAccountId,
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
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.id));

  const userAccounts = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const accountNames = new Map<number, string>(
    userAccounts.map((account: { id: number; name: string }) => [account.id, account.name])
  );
  const result = rows.map((r: (typeof rows)[number]) => ({
    ...r,
    counterpartyAccountName: r.counterpartyAccountId
      ? (accountNames.get(r.counterpartyAccountId) ?? null)
      : null,
    affectCash: fromDbBool(r.affectCash),
    affectHolding: fromDbBool(r.affectHolding),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }

  const {
    accountId,
    holdingId,
    type,
    date,
    amount,
    shares: txShares,
    price: txPrice,
    fee = 0,
    note,
  } = body;

  const txType = type as TransactionType;
  if (
    !VALID_TRANSACTION_TYPES.includes(txType) ||
    txType === "transfer_out" ||
    txType === "transfer_in"
  ) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const accountIdNum = Number(accountId);
  if (!Number.isFinite(accountIdNum)) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }

  const holdingIdNum = holdingId != null ? Number(holdingId) : null;
  if (holdingId != null && !Number.isFinite(holdingIdNum)) {
    return NextResponse.json({ error: "Invalid holdingId" }, { status: 400 });
  }

  let affectCash: boolean;
  let affectHolding: boolean;
  if (body.affectCash !== undefined || body.affectHolding !== undefined) {
    affectCash = body.affectCash !== undefined ? !!body.affectCash : true;
    affectHolding = body.affectHolding !== undefined ? !!body.affectHolding : true;
  } else {
    const legacy = body.affectBalance !== undefined ? !!body.affectBalance : true;
    affectCash = legacy;
    affectHolding = legacy;
  }

  if (txType === "fee") {
    affectCash = true;
    affectHolding = false;
  } else if (txType !== "buy" && txType !== "sell") {
    affectHolding = false;
  }

  if (!accountId || !date || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if ((txType === "buy" || txType === "sell") && !holdingIdNum) {
    return NextResponse.json({ error: "买入/卖出交易必须关联持仓" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let holding: any = null;
  if (holdingIdNum) {
    const [h] = await db.select().from(holdings).where(eq(holdings.id, holdingIdNum));
    holding = h || null;
    if (!holding) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 });
    }

    const [holdingAccount] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, holding.accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!holdingAccount) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 });
    }
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountIdNum), eq(accounts.userId, userId)));
  if (!account) {
    return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  }

  if (holding && holding.accountId !== accountIdNum) {
    return NextResponse.json({ error: "持仓不属于该账户" }, { status: 400 });
  }

  const parsedAmount = roundForStorage(parseFloat(amount) || 0, "amount");
  if (txType === "fee" && parsedAmount <= 0) {
    return NextResponse.json({ error: "费用金额必须大于0" }, { status: 400 });
  }

  const parsedTxShares =
    txShares != null ? roundForStorage(parseFloat(txShares) || 0, "shares") : null;
  const parsedTxPrice = txPrice != null ? roundForStorage(parseFloat(txPrice) || 0, "price") : null;
  const parsedFee = txType === "fee" ? 0 : roundForStorage(parseFloat(fee) || 0, "amount");

  if (
    holding?.valuationMode === "shares" &&
    (txType === "buy" || txType === "sell") &&
    (parsedTxShares == null || parsedTxShares <= 0 || parsedTxPrice == null || parsedTxPrice <= 0)
  ) {
    return NextResponse.json({ error: "份额模式买卖必须填写有效股数和成交价" }, { status: 400 });
  }

  if (txType === "sell" && holding && affectHolding) {
    if (holding.valuationMode === "amount" && holding.marketValue <= 0) {
      return NextResponse.json({ error: "当前市值为0，无法卖出" }, { status: 400 });
    }
    if (
      holding.valuationMode === "shares" &&
      parsedTxShares != null &&
      parsedTxShares > holding.shares
    ) {
      return NextResponse.json({ error: "卖出份额不能超过持有份额" }, { status: 400 });
    }
  }

  let finalAmount = parsedAmount;
  if (
    holding?.valuationMode === "shares" &&
    (txType === "buy" || txType === "sell") &&
    parsedTxShares != null &&
    parsedTxPrice != null
  ) {
    finalAmount = roundForStorage(parsedTxShares * parsedTxPrice, "amount");
  }

  let cashDelta = 0;
  let principalDelta = 0;
  let realizedPnl = 0;
  let holdingSharesDelta = 0;
  let holdingCostDelta = 0;
  let holdingMarketValueDelta = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let holdingUpdateSet: Record<string, any> | null = null;
  const now = new Date().toISOString();

  if (txType === "buy") {
    realizedPnl = parsedFee > 0 ? calculateFeeRealizedPnl(parsedFee) : 0;
    if (affectCash) {
      cashDelta = roundForStorage(-finalAmount - parsedFee, "amount");
    }
    if (affectHolding && holding) {
      if (holding.valuationMode === "shares" && parsedTxShares != null) {
        const newShares = roundForStorage(holding.shares + parsedTxShares, "shares");
        const newPrice =
          parsedTxPrice != null ? parsedTxPrice : roundForStorage(holding.price, "price");
        holdingSharesDelta = parsedTxShares;
        holdingCostDelta = roundForStorage(newPrice * parsedTxShares, "amount");
        const newCostRaw =
          newShares > 0 ? (holding.cost * holding.shares + holdingCostDelta) / newShares : newPrice;
        const newMarketValue = roundForStorage(newShares * newPrice, "amount");
        holdingMarketValueDelta = roundForStorage(newMarketValue - holding.marketValue, "amount");
        holdingUpdateSet = {
          cost: roundForStorage(newCostRaw, "price"),
          shares: newShares,
          price: newPrice,
          marketValue: newMarketValue,
          updatedAt: now,
        };
      } else {
        holdingCostDelta = finalAmount;
        holdingMarketValueDelta = finalAmount;
        holdingUpdateSet = {
          cost: roundForStorage(holding.cost + holdingCostDelta, "amount"),
          marketValue: roundForStorage(holding.marketValue + holdingMarketValueDelta, "amount"),
          updatedAt: now,
        };
      }
    }
  }

  if (txType === "sell") {
    if (affectCash) {
      cashDelta = roundForStorage(finalAmount - parsedFee, "amount");
    }
    if (affectHolding && holding) {
      if (holding.valuationMode === "shares" && parsedTxShares != null) {
        const costReduce = roundForStorage(holding.cost * parsedTxShares, "amount");
        const newShares = roundForStorage(holding.shares - parsedTxShares, "shares");
        const newPrice =
          parsedTxPrice != null ? parsedTxPrice : roundForStorage(holding.price, "price");
        const newMarketValue = roundForStorage(newShares * newPrice, "amount");
        holdingSharesDelta = roundForStorage(-parsedTxShares, "shares");
        holdingCostDelta = roundForStorage(-costReduce, "amount");
        holdingMarketValueDelta = roundForStorage(newMarketValue - holding.marketValue, "amount");
        realizedPnl = roundForStorage(finalAmount - costReduce - parsedFee, "amount");
        holdingUpdateSet = {
          cost: roundForStorage(holding.cost, "price"),
          shares: newShares,
          price: newPrice,
          marketValue: newMarketValue,
          updatedAt: now,
        };
      } else {
        const costReduce =
          holding.marketValue > 0
            ? roundForStorage((finalAmount * holding.cost) / holding.marketValue, "amount")
            : 0;
        holdingCostDelta = roundForStorage(-costReduce, "amount");
        holdingMarketValueDelta = roundForStorage(-finalAmount, "amount");
        realizedPnl = roundForStorage(finalAmount - costReduce - parsedFee, "amount");
        holdingUpdateSet = {
          cost: roundForStorage(holding.cost + holdingCostDelta, "amount"),
          marketValue: roundForStorage(holding.marketValue + holdingMarketValueDelta, "amount"),
          updatedAt: now,
        };
      }
    }
  }

  if (txType === "dividend") {
    if (affectCash) {
      cashDelta = roundForStorage(finalAmount - parsedFee, "amount");
      realizedPnl = roundForStorage(finalAmount - parsedFee, "amount");
    }
  }

  if (txType === "deposit" && affectCash) {
    cashDelta = finalAmount;
    principalDelta = finalAmount;
  }

  if (txType === "withdraw" && affectCash) {
    cashDelta = roundForStorage(-finalAmount, "amount");
    principalDelta = roundForStorage(-finalAmount, "amount");
  }

  if (txType === "fee") {
    cashDelta = roundForStorage(-finalAmount, "amount");
    realizedPnl = calculateFeeRealizedPnl(finalAmount);
  }

  const nextCashBalance = roundForStorage(account.cashBalance + cashDelta, "amount");
  const nextPrincipal = roundForStorage((account.principal ?? 0) + principalDelta, "amount");
  const nextRealizedPnl = roundForStorage((account.realizedPnl ?? 0) + realizedPnl, "amount");
  const shouldUpdateAccount = cashDelta !== 0 || principalDelta !== 0 || realizedPnl !== 0;
  let txRecord;

  const txValues = {
    accountId: accountIdNum,
    holdingId: holdingIdNum || null,
    type: txType,
    date,
    amount: finalAmount,
    realizedPnl,
    cashDelta,
    principalDelta,
    holdingSharesDelta,
    holdingCostDelta,
    holdingMarketValueDelta,
    shares: parsedTxShares,
    price: parsedTxPrice,
    fee: parsedFee,
    affectCash: toDbBool(affectCash),
    affectHolding: toDbBool(affectHolding),
    note: note || null,
  };

  if (isPostgres) {
    // neon-http does not support db.transaction; use atomic batch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: any[] = [db.insert(transactions).values(txValues).returning()];
    if (holdingUpdateSet && holdingIdNum) {
      ops.push(db.update(holdings).set(holdingUpdateSet).where(eq(holdings.id, holdingIdNum)));
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
          .where(eq(accounts.id, accountIdNum))
      );
    }

    const batchResult = await db.batch(ops);
    txRecord = batchResult[0][0];
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txRecord = await db.transaction(async (tx: any) => {
      const [created] = await tx.insert(transactions).values(txValues).returning();
      if (holdingUpdateSet && holdingIdNum) {
        await tx.update(holdings).set(holdingUpdateSet).where(eq(holdings.id, holdingIdNum));
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
          .where(eq(accounts.id, accountIdNum));
      }
      return created;
    });
  }

  return runMutationWithNetvalue(userId, async () =>
    NextResponse.json(
      {
        ...txRecord,
        affectCash: fromDbBool(txRecord.affectCash),
        affectHolding: fromDbBool(txRecord.affectHolding),
      },
      { status: 201 }
    )
  );
}
