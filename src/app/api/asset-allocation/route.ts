import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, settings } from "@/db/schema";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";
import { eq } from "drizzle-orm";

export async function GET() {
  const [ratesResult, allAccounts, allHoldings, allClasses] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts).all(),
    db.select().from(holdings).all(),
    db.select().from(assetClasses).all(),
  ]);

  const rates = ratesResult.rates;

  // Read global thresholds from settings
  const warnRow = db.select().from(settings).where(eq(settings.key, "warning_threshold")).get();
  const dangerRow = db.select().from(settings).where(eq(settings.key, "danger_threshold")).get();
  const colorRow = db.select().from(settings).where(eq(settings.key, "color_mode")).get();
  const warningThreshold = warnRow ? parseFloat(warnRow.value) : 3;
  const dangerThreshold = dangerRow ? parseFloat(dangerRow.value) : 5;
  const colorMode = (colorRow?.value === "us" ? "us" : "cn") as "cn" | "us";

  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));

  // Calculate total asset in CNY
  const totalAssetCny = allAccounts.reduce(
    (sum, a) => sum + convertToCNY(a.totalBalance, a.currency, rates),
    0
  );

  // Group holdings by asset class with details
  const classHoldings: Record<string, typeof allHoldings> = {};
  const classValues: Record<string, number> = {};
  for (const h of allHoldings) {
    const account = accountMap.get(h.accountId);
    if (!account) continue;
    const valueCny = convertToCNY(h.marketValue, account.currency, rates);
    classValues[h.assetClass] = (classValues[h.assetClass] || 0) + valueCny;
    if (!classHoldings[h.assetClass]) classHoldings[h.assetClass] = [];
    classHoldings[h.assetClass].push(h);
  }

  // Calculate total cash in CNY and per-account cash
  const accountCash: { accountId: number; accountName: string; currency: string; cash: number; cashCny: number }[] = [];
  let totalCashCny = 0;
  for (const a of allAccounts) {
    const accHoldings = allHoldings.filter((h) => h.accountId === a.id);
    const holdingsTotal = accHoldings.reduce((s, h) => s + h.marketValue, 0);
    const cash = Math.max(0, a.totalBalance - holdingsTotal);
    const cashCny = convertToCNY(cash, a.currency, rates);
    totalCashCny += cashCny;
    if (cash > 0) {
      accountCash.push({ accountId: a.id, accountName: a.name, currency: a.currency, cash, cashCny });
    }
  }

  // Build allocation result
  const allocation = allClasses.map((cls) => {
    const isCash = cls.name === "现金";
    const actualValue = isCash ? totalCashCny : (classValues[cls.name] || 0);
    const actualPct = totalAssetCny > 0 ? +((actualValue / totalAssetCny) * 100).toFixed(2) : 0;
    const deviation = +(actualPct - cls.targetPct).toFixed(2);
    const absDeviation = Math.abs(deviation);

    let status: "normal" | "warning" | "danger" = "normal";
    if (absDeviation >= dangerThreshold) {
      status = "danger";
    } else if (absDeviation >= warningThreshold) {
      status = "warning";
    }

    // Build holdings list for this class
    const holdingsList = isCash
      ? accountCash.map((ac) => ({
          id: -ac.accountId,
          name: `${ac.accountName} 现金`,
          accountId: ac.accountId,
          accountName: ac.accountName,
          currency: ac.currency,
          cost: ac.cash,
          marketValue: ac.cash,
          marketValueCny: ac.cashCny,
          returnRate: null as number | null,
          pnlAmount: 0,
          pnlAmountCny: 0,
          pctOfTotal: totalAssetCny > 0 ? +((ac.cashCny / totalAssetCny) * 100).toFixed(2) : 0,
        }))
      : (classHoldings[cls.name] || []).map((h) => {
          const account = accountMap.get(h.accountId)!;
          const valueCny = convertToCNY(h.marketValue, account.currency, rates);
          const returnRate = h.cost > 0 ? +(((h.marketValue - h.cost) / h.cost) * 100).toFixed(2) : null;
          const pnlAmount = h.cost > 0 ? +(h.marketValue - h.cost) : 0;
          const costCny = convertToCNY(h.cost, account.currency, rates);
          const pnlAmountCny = h.cost > 0 ? +(valueCny - costCny) : 0;
          return {
            id: h.id,
            name: h.name,
            accountId: h.accountId,
            accountName: account.name,
            currency: account.currency,
            cost: h.cost,
            marketValue: h.marketValue,
            marketValueCny: +valueCny.toFixed(2),
            returnRate,
            pnlAmount: +pnlAmount.toFixed(2),
            pnlAmountCny: +pnlAmountCny.toFixed(2),
            pctOfTotal: totalAssetCny > 0 ? +((valueCny / totalAssetCny) * 100).toFixed(2) : 0,
          };
        });

    // Category-level cost, P&L, and rebalance adjustment
    const totalCost = isCash ? 0 : holdingsList.reduce((s, h) => s + convertToCNY(h.cost, h.currency, rates), 0);
    const totalPnl = isCash ? 0 : +(actualValue - totalCost).toFixed(2);
    const adjustAmount = +((cls.targetPct / 100) * totalAssetCny - actualValue).toFixed(2);

    return {
      id: cls.id,
      name: cls.name,
      targetPct: cls.targetPct,
      actualPct,
      actualValue: +actualValue.toFixed(2),
      deviation,
      status,
      adjustAmount,
      totalCost: +totalCost.toFixed(2),
      totalPnl,
      holdings: holdingsList,
    };
  });

  return NextResponse.json({
    totalAssetCny: +totalAssetCny.toFixed(2),
    allocation,
    rates: ratesResult,
    settings: { warningThreshold, dangerThreshold, colorMode },
  });
}
