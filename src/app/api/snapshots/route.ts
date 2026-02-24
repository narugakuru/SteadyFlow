import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, snapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";

export async function GET() {
  const rows = db
    .select()
    .from(snapshots)
    .orderBy(desc(snapshots.date))
    .all();

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      dataJson: JSON.parse(r.dataJson),
    }))
  );
}

export async function POST() {
  const today = new Date().toISOString().slice(0, 10);

  const [ratesResult, allAccounts, allHoldings, allClasses] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts).all(),
    db.select().from(holdings).all(),
    db.select().from(assetClasses).all(),
  ]);

  const rates = ratesResult.rates;
  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));

  const totalAssetCny = allAccounts.reduce(
    (sum, a) => sum + convertToCNY(a.totalBalance, a.currency, rates),
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

  // Cash per account
  const totalCashCny = allAccounts.reduce((sum, a) => {
    const accHoldings = allHoldings.filter((h) => h.accountId === a.id);
    const holdingsTotal = accHoldings.reduce((s, h) => s + h.marketValue, 0);
    const cash = Math.max(0, a.totalBalance - holdingsTotal);
    return sum + convertToCNY(cash, a.currency, rates);
  }, 0);

  const data = {
    allocation: allClasses.map((cls) => {
      const actualValue = cls.name === "现金" ? totalCashCny : (classValues[cls.name] || 0);
      const actualPct = totalAssetCny > 0 ? +((actualValue / totalAssetCny) * 100).toFixed(2) : 0;
      return { name: cls.name, actualValue: +actualValue.toFixed(2), actualPct };
    }),
    accounts: allAccounts.map((a) => {
      const accHoldings = allHoldings.filter((h) => h.accountId === a.id);
      const holdingsTotal = accHoldings.reduce((s, h) => s + h.marketValue, 0);
      const cash = Math.max(0, a.totalBalance - holdingsTotal);
      return {
        name: a.name,
        currency: a.currency,
        totalCny: +convertToCNY(a.totalBalance, a.currency, rates).toFixed(2),
        cashCny: +convertToCNY(cash, a.currency, rates).toFixed(2),
      };
    }),
    rates: ratesResult.rates,
  };

  // Upsert today's snapshot
  const existing = db
    .select()
    .from(snapshots)
    .where(eq(snapshots.date, today))
    .get();

  if (existing) {
    db.update(snapshots)
      .set({
        totalAssetCny: +totalAssetCny.toFixed(2),
        dataJson: JSON.stringify(data),
      })
      .where(eq(snapshots.date, today))
      .run();
  } else {
    db.insert(snapshots)
      .values({
        date: today,
        totalAssetCny: +totalAssetCny.toFixed(2),
        dataJson: JSON.stringify(data),
      })
      .run();
  }

  return NextResponse.json({ date: today, totalAssetCny: +totalAssetCny.toFixed(2), data });
}
