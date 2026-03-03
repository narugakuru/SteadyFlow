import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, holdings, accounts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { fromDbBool, toDbBool } from "@/lib/utils";
import { roundForStorage } from "@/lib/format";
import { runMutationWithNetvalue } from "@/lib/mutation-with-netvalue";

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
  if (type)
    conditions.push(
      eq(transactions.type, type as "buy" | "sell" | "dividend" | "deposit" | "withdraw")
    );

  const rows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      holdingId: transactions.holdingId,
      type: transactions.type,
      date: transactions.date,
      amount: transactions.amount,
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

  const result = rows.map((r: (typeof rows)[number]) => ({
    ...r,
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

  const accountIdNum = Number(accountId);
  if (!Number.isFinite(accountIdNum)) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }

  const holdingIdNum = holdingId != null ? Number(holdingId) : null;
  if (holdingId != null && !Number.isFinite(holdingIdNum)) {
    return NextResponse.json({ error: "Invalid holdingId" }, { status: 400 });
  }

  // Resolve affectCash / affectHolding with backward compat for affectBalance
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

  if (!accountId || !type || !date || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validTypes = ["buy", "sell", "dividend", "deposit", "withdraw"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  // For buy/sell, holdingId is required
  if ((type === "buy" || type === "sell") && !holdingIdNum) {
    return NextResponse.json({ error: "买入/卖出交易必须关联持仓" }, { status: 400 });
  }

  // Get holding if needed
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

  // Get account
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
  const parsedTxShares =
    txShares != null ? roundForStorage(parseFloat(txShares) || 0, "shares") : null;
  const parsedTxPrice = txPrice != null ? roundForStorage(parseFloat(txPrice) || 0, "price") : null;
  const parsedFee = roundForStorage(parseFloat(fee) || 0, "amount");

  // Sell validations
  if (type === "sell" && holding) {
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

  // Calculate actual amount for shares mode buy/sell
  let finalAmount = parsedAmount;
  if (
    holding?.valuationMode === "shares" &&
    (type === "buy" || type === "sell") &&
    parsedTxShares != null &&
    parsedTxPrice != null
  ) {
    finalAmount = roundForStorage(parsedTxShares * parsedTxPrice, "amount");
  }

  // Create transaction record
  // affectCash/affectHolding: persist as 0/1 across SQLite and PostgreSQL
  const [txRecord] = await db
    .insert(transactions)
    .values({
      accountId: accountIdNum,
      holdingId: holdingIdNum || null,
      type,
      date,
      amount: finalAmount,
      shares: parsedTxShares,
      price: parsedTxPrice,
      fee: parsedFee,
      affectCash: toDbBool(affectCash),
      affectHolding: toDbBool(affectHolding),
      note: note || null,
    })
    .returning();

  // Apply side effects
  const feeVal = parsedFee;
  const now = new Date().toISOString();

  switch (type) {
    case "buy": {
      if (affectHolding && holding) {
        if (holding.valuationMode === "shares" && parsedTxShares != null) {
          const newShares = roundForStorage(holding.shares + parsedTxShares, "shares");
          const newPrice =
            parsedTxPrice != null ? parsedTxPrice : roundForStorage(holding.price, "price");
          // 加权平均成本法：newCost = (oldCost × oldShares + txPrice × txShares) / newShares
          // cost 在 shares 模式下存储的是"平均每股成本"
          const newCostRaw =
            newShares > 0
              ? (holding.cost * holding.shares + newPrice * parsedTxShares) / newShares
              : newPrice;
          const newCost = roundForStorage(newCostRaw, "price");
          await db
            .update(holdings)
            .set({
              cost: newCost,
              shares: newShares,
              price: newPrice,
              marketValue: roundForStorage(newShares * newPrice, "amount"),
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingIdNum));
        } else {
          // amount 模式：cost 累加总成本
          await db
            .update(holdings)
            .set({
              cost: roundForStorage(holding.cost + finalAmount, "amount"),
              marketValue: roundForStorage(holding.marketValue + finalAmount, "amount"),
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingIdNum));
        }
      }
      if (affectCash) {
        await db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(account.cashBalance - finalAmount - feeVal, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, accountIdNum));
      }
      break;
    }

    case "sell": {
      if (affectHolding && holding) {
        if (holding.valuationMode === "shares" && parsedTxShares != null) {
          // shares 模式卖出：cost（平均每股成本）不变，只减少份额
          const newShares = roundForStorage(holding.shares - parsedTxShares, "shares");
          const newPrice =
            parsedTxPrice != null ? parsedTxPrice : roundForStorage(holding.price, "price");
          await db
            .update(holdings)
            .set({
              cost: roundForStorage(holding.cost, "price"), // 卖出不改变平均成本
              shares: newShares,
              price: newPrice,
              marketValue: roundForStorage(newShares * newPrice, "amount"),
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingIdNum));
        } else {
          // amount 模式卖出：按比例扣减成本
          const costReduce =
            holding.marketValue > 0 ? (finalAmount * holding.cost) / holding.marketValue : 0;
          await db
            .update(holdings)
            .set({
              cost: roundForStorage(holding.cost - costReduce, "amount"),
              marketValue: roundForStorage(holding.marketValue - finalAmount, "amount"),
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingIdNum));
        }
      }
      if (affectCash) {
        await db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(account.cashBalance + finalAmount - feeVal, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, accountIdNum));
      }
      break;
    }

    case "dividend": {
      if (affectCash) {
        await db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(account.cashBalance + finalAmount - feeVal, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, accountIdNum));
      }
      break;
    }

    case "deposit": {
      if (affectCash) {
        await db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(account.cashBalance + finalAmount, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, accountIdNum));
      }
      break;
    }

    case "withdraw": {
      if (affectCash) {
        await db
          .update(accounts)
          .set({
            cashBalance: roundForStorage(account.cashBalance - finalAmount, "amount"),
            updatedAt: now,
          })
          .where(eq(accounts.id, accountIdNum));
      }
      break;
    }
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
