/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, netvalue } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";
import { requireUser } from "@/lib/auth-utils";
import { roundForStorage } from "@/lib/format";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db
    .select()
    .from(netvalue)
    .where(eq(netvalue.userId, userId))
    .orderBy(desc(netvalue.date));

  return NextResponse.json(
    rows.map((r: any) => ({
      ...r,
      dataJson: JSON.parse(r.dataJson),
    }))
  );
}

export async function POST() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [ratesResult, allAccounts, allClasses]: any[] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(assetClasses).where(eq(assetClasses.userId, userId)),
  ]);

  const accountIds = allAccounts.map((account: any) => account.id);
  const allHoldings = accountIds.length
    ? await db.select().from(holdings).where(inArray(holdings.accountId, accountIds))
    : [];

  const rates = ratesResult.rates;
  const accountMap: Map<number, any> = new Map(allAccounts.map((a: any) => [a.id, a]));

  // Calculate holdings value per account
  const accountHoldingsValue: Record<number, number> = {};
  for (const h of allHoldings) {
    accountHoldingsValue[h.accountId] = (accountHoldingsValue[h.accountId] || 0) + h.marketValue;
  }

  // Total asset = Σ(cashBalance + holdingsValue) per account in CNY
  const totalAssetCny = allAccounts.reduce(
    (sum: number, a: any) => {
      const accountValue = a.cashBalance + (accountHoldingsValue[a.id] || 0);
      return sum + convertToCNY(accountValue, a.currency, rates);
    },
    0
  );

  // Holdings value per class
  const classValues: Record<string, number> = {};
  for (const h of allHoldings) {
    const account = accountMap.get(h.accountId);
    if (!account) continue;
    const valueCny = convertToCNY(h.marketValue, account.currency, rates);
    classValues[h.assetClass] = (classValues[h.assetClass] || 0) + valueCny;
  }

  // Cash per account — directly from cashBalance
  const totalCashCny = allAccounts.reduce((sum: number, a: any) => {
    return sum + convertToCNY(a.cashBalance, a.currency, rates);
  }, 0);

  const data = {
    allocation: allClasses.map((cls: any) => {
      const actualValue = cls.name === "现金" ? totalCashCny : (classValues[cls.name] || 0);
      const actualPct =
        totalAssetCny > 0
          ? roundForStorage((actualValue / totalAssetCny) * 100, "percent")
          : 0;
      return { name: cls.name, actualValue: roundForStorage(actualValue, "amount"), actualPct };
    }),
    accounts: allAccounts.map((a: any) => {
      const holdingsVal = accountHoldingsValue[a.id] || 0;
      const accountValue = a.cashBalance + holdingsVal;
      return {
        name: a.name,
        currency: a.currency,
        totalCny: roundForStorage(convertToCNY(accountValue, a.currency, rates), "amount"),
        cashCny: roundForStorage(convertToCNY(a.cashBalance, a.currency, rates), "amount"),
      };
    }),
    rates: ratesResult.rates,
  };

  // Upsert today's netvalue
  const [existing] = await db
    .select()
    .from(netvalue)
    .where(and(eq(netvalue.userId, userId), eq(netvalue.date, today)));

  if (existing) {
    await db.update(netvalue)
      .set({
        totalAssetCny: roundForStorage(totalAssetCny, "amount"),
        dataJson: JSON.stringify(data),
      })
      .where(and(eq(netvalue.userId, userId), eq(netvalue.date, today)));
  } else {
    await db.insert(netvalue)
      .values({
        userId,
        date: today,
        totalAssetCny: roundForStorage(totalAssetCny, "amount"),
        dataJson: JSON.stringify(data),
      });
  }

  return NextResponse.json({
    date: today,
    totalAssetCny: roundForStorage(totalAssetCny, "amount"),
    data,
  });
}
