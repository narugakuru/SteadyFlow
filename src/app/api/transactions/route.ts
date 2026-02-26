import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, holdings, accounts } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");

  const conditions = [];
  if (accountId) conditions.push(eq(transactions.accountId, Number(accountId)));
  if (type) conditions.push(eq(transactions.type, type as any));

  const rows = db
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
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(holdings, eq(transactions.holdingId, holdings.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();

  const result = rows.map((r) => ({
    ...r,
    affectCash: !!r.affectCash,
    affectHolding: !!r.affectHolding,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
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
  if ((type === "buy" || type === "sell") && !holdingId) {
    return NextResponse.json({ error: "买入/卖出交易必须关联持仓" }, { status: 400 });
  }

  // Get holding if needed
  let holding: any = null;
  if (holdingId) {
    holding = db.select().from(holdings).where(eq(holdings.id, holdingId)).get();
    if (!holding) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 });
    }
  }

  // Get account
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) {
    return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  }

  // Sell validations
  if (type === "sell" && holding) {
    if (holding.valuationMode === "amount" && holding.marketValue <= 0) {
      return NextResponse.json({ error: "当前市值为0，无法卖出" }, { status: 400 });
    }
    if (holding.valuationMode === "shares" && txShares != null && txShares > holding.shares) {
      return NextResponse.json({ error: "卖出份额不能超过持有份额" }, { status: 400 });
    }
  }

  // Calculate actual amount for shares mode buy/sell
  let finalAmount = parseFloat(amount);
  if (holding?.valuationMode === "shares" && (type === "buy" || type === "sell") && txShares != null && txPrice != null) {
    finalAmount = txShares * txPrice;
  }

  // Create transaction record
  const txRecord = db
    .insert(transactions)
    .values({
      accountId,
      holdingId: holdingId || null,
      type,
      date,
      amount: finalAmount,
      shares: txShares != null ? parseFloat(txShares) : null,
      price: txPrice != null ? parseFloat(txPrice) : null,
      fee: parseFloat(fee) || 0,
      affectCash: affectCash ? 1 : 0,
      affectHolding: affectHolding ? 1 : 0,
      note: note || null,
    })
    .returning()
    .get();

  // Apply side effects
  const feeVal = parseFloat(fee) || 0;
  const now = new Date().toISOString();

  switch (type) {
    case "buy": {
      if (affectHolding && holding) {
        if (holding.valuationMode === "shares" && txShares != null) {
          const newShares = holding.shares + parseFloat(txShares);
          db.update(holdings)
            .set({
              cost: holding.cost + finalAmount,
              shares: newShares,
              marketValue: newShares * holding.price,
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingId))
            .run();
        } else {
          db.update(holdings)
            .set({
              cost: holding.cost + finalAmount,
              marketValue: holding.marketValue + finalAmount,
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingId))
            .run();
        }
      }
      if (affectCash) {
        db.update(accounts)
          .set({ cashBalance: account.cashBalance - finalAmount - feeVal, updatedAt: now })
          .where(eq(accounts.id, accountId))
          .run();
      }
      break;
    }

    case "sell": {
      if (affectHolding && holding) {
        if (holding.valuationMode === "shares" && txShares != null) {
          const avgCost = holding.shares > 0 ? holding.cost / holding.shares : 0;
          const costReduce = parseFloat(txShares) * avgCost;
          const newShares = holding.shares - parseFloat(txShares);
          db.update(holdings)
            .set({
              cost: holding.cost - costReduce,
              shares: newShares,
              marketValue: newShares * holding.price,
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingId))
            .run();
        } else {
          const costReduce = holding.marketValue > 0
            ? finalAmount * holding.cost / holding.marketValue
            : 0;
          db.update(holdings)
            .set({
              cost: holding.cost - costReduce,
              marketValue: holding.marketValue - finalAmount,
              updatedAt: now,
            })
            .where(eq(holdings.id, holdingId))
            .run();
        }
      }
      if (affectCash) {
        db.update(accounts)
          .set({ cashBalance: account.cashBalance + finalAmount - feeVal, updatedAt: now })
          .where(eq(accounts.id, accountId))
          .run();
      }
      break;
    }

    case "dividend": {
      if (affectCash) {
        db.update(accounts)
          .set({ cashBalance: account.cashBalance + finalAmount - feeVal, updatedAt: now })
          .where(eq(accounts.id, accountId))
          .run();
      }
      break;
    }

    case "deposit": {
      if (affectCash) {
        db.update(accounts)
          .set({
            totalCost: account.totalCost + finalAmount,
            cashBalance: account.cashBalance + finalAmount,
            updatedAt: now,
          })
          .where(eq(accounts.id, accountId))
          .run();
      }
      break;
    }

    case "withdraw": {
      if (affectCash) {
        db.update(accounts)
          .set({
            totalCost: account.totalCost - finalAmount,
            cashBalance: account.cashBalance - finalAmount,
            updatedAt: now,
          })
          .where(eq(accounts.id, accountId))
          .run();
      }
      break;
    }
  }

  return NextResponse.json({
    ...txRecord,
    affectCash: !!txRecord.affectCash,
    affectHolding: !!txRecord.affectHolding,
  }, { status: 201 });
}
