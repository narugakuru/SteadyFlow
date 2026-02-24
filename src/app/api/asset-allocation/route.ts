import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses } from "@/db/schema";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";

export async function GET() {
  const [ratesResult, allAccounts, allHoldings, allClasses] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts).all(),
    db.select().from(holdings).all(),
    db.select().from(assetClasses).all(),
  ]);

  const rates = ratesResult.rates;

  // Build account currency map
  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));

  // Calculate total asset in CNY
  const totalAssetCny = allAccounts.reduce(
    (sum, a) => sum + convertToCNY(a.totalBalance, a.currency, rates),
    0
  );

  // Calculate holdings value per asset class in CNY
  const classValues: Record<string, number> = {};
  for (const h of allHoldings) {
    const account = accountMap.get(h.accountId);
    if (!account) continue;
    const valueCny = convertToCNY(h.marketValue, account.currency, rates);
    classValues[h.assetClass] = (classValues[h.assetClass] || 0) + valueCny;
  }

  // Calculate total cash in CNY
  const totalCashCny = allAccounts.reduce((sum, a) => {
    const accountHoldings = allHoldings.filter((h) => h.accountId === a.id);
    const holdingsTotal = accountHoldings.reduce((s, h) => s + h.marketValue, 0);
    const cash = Math.max(0, a.totalBalance - holdingsTotal);
    return sum + convertToCNY(cash, a.currency, rates);
  }, 0);

  // Build allocation result
  const allocation = allClasses.map((cls) => {
    const actualValue = cls.name === "现金" ? totalCashCny : (classValues[cls.name] || 0);
    const actualPct = totalAssetCny > 0 ? +((actualValue / totalAssetCny) * 100).toFixed(2) : 0;
    const deviation = +(actualPct - cls.targetPct).toFixed(2);
    const absDeviation = Math.abs(deviation);

    let status: "normal" | "warning" | "danger" = "normal";
    if (absDeviation >= cls.dangerThreshold) {
      status = "danger";
    } else if (absDeviation >= cls.warningThreshold) {
      status = "warning";
    }

    return {
      id: cls.id,
      name: cls.name,
      targetPct: cls.targetPct,
      actualPct,
      actualValue: +actualValue.toFixed(2),
      deviation,
      status,
      warningThreshold: cls.warningThreshold,
      dangerThreshold: cls.dangerThreshold,
    };
  });

  return NextResponse.json({
    totalAssetCny: +totalAssetCny.toFixed(2),
    allocation,
    rates: ratesResult,
  });
}
