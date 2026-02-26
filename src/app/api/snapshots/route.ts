import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, snapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";

export async function GET() {
  const rows = await db
    .select()
    .from(snapshots)
    .orderBy(desc(snapshots.date));

  return NextResponse.json(
    rows.map((r: any) => ({
      ...r,
      dataJson: JSON.parse(r.dataJson),
    }))
  );
}

export async function POST() {
  const today = new Date().toISOString().slice(0, 10);

  const [ratesResult, allAccounts, allHoldings, allClasses]: any[] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts),
    db.select().from(holdings),
    db.select().from(assetClasses),
  ]);

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
      const actualPct = totalAssetCny > 0 ? +((actualValue / totalAssetCny) * 100).toFixed(2) : 0;
      return { name: cls.name, actualValue: +actualValue.toFixed(2), actualPct };
    }),
    accounts: allAccounts.map((a: any) => {
      const holdingsVal = accountHoldingsValue[a.id] || 0;
      const accountValue = a.cashBalance + holdingsVal;
      return {
        name: a.name,
        currency: a.currency,
        totalCny: +convertToCNY(accountValue, a.currency, rates).toFixed(2),
        cashCny: +convertToCNY(a.cashBalance, a.currency, rates).toFixed(2),
      };
    }),
    rates: ratesResult.rates,
  };

  // Upsert today's snapshot
  const [existing] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.date, today));

  if (existing) {
    await db.update(snapshots)
      .set({
        totalAssetCny: +totalAssetCny.toFixed(2),
        dataJson: JSON.stringify(data),
      })
      .where(eq(snapshots.date, today));
  } else {
    await db.insert(snapshots)
      .values({
        date: today,
        totalAssetCny: +totalAssetCny.toFixed(2),
        dataJson: JSON.stringify(data),
      });
  }

  return NextResponse.json({ date: today, totalAssetCny: +totalAssetCny.toFixed(2), data });
}
