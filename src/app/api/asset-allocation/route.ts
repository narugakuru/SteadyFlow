/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, settings } from "@/db/schema";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { roundForStorage } from "@/lib/format";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

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

  // Read global thresholds from settings
  const [warnRow] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "warning_threshold")));
  const [dangerRow] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "danger_threshold")));
  const [colorRow] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "color_mode")));
  const warningThreshold = warnRow ? parseFloat(warnRow.value) : 5;
  const dangerThreshold = dangerRow ? parseFloat(dangerRow.value) : 15;
  const colorMode = (colorRow?.value === "us" ? "us" : "cn") as "cn" | "us";

  const accountMap: Map<number, any> = new Map(allAccounts.map((a: any) => [a.id, a]));

  // Calculate holdings value per account for total asset calculation
  const accountHoldingsValue: Record<number, number> = {};
  for (const h of allHoldings) {
    accountHoldingsValue[h.accountId] = (accountHoldingsValue[h.accountId] || 0) + h.marketValue;
  }

  // Calculate total asset in CNY: Σ(cashBalance + holdingsValue) per account
  const totalAssetCny = allAccounts.reduce((sum: number, a: any) => {
    const accountValue = a.cashBalance + (accountHoldingsValue[a.id] || 0);
    return sum + convertToCNY(accountValue, a.currency, rates);
  }, 0);

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

  // Calculate total cash in CNY directly from cashBalance
  const accountCash: {
    accountId: number;
    accountName: string;
    currency: string;
    cash: number;
    cashCny: number;
  }[] = [];
  let totalCashCny = 0;
  for (const a of allAccounts) {
    const cashCny = convertToCNY(a.cashBalance, a.currency, rates);
    totalCashCny += cashCny;
    if (a.cashBalance > 0) {
      accountCash.push({
        accountId: a.id,
        accountName: a.name,
        currency: a.currency,
        cash: a.cashBalance,
        cashCny,
      });
    }
  }

  // Build allocation result
  const allocation = allClasses.map((cls: any) => {
    const isCash = cls.name === "现金";
    const actualValue = isCash ? totalCashCny : classValues[cls.name] || 0;
    const actualPct =
      totalAssetCny > 0
        ? roundForStorage((actualValue / totalAssetCny) * 100, "percent")
        : 0;
    const deviation = roundForStorage(actualPct - cls.targetPct, "percent");
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
          pctOfTotal:
            totalAssetCny > 0
              ? roundForStorage((ac.cashCny / totalAssetCny) * 100, "percent")
              : 0,
        }))
      : (classHoldings[cls.name] || []).map((h: any) => {
          const account = accountMap.get(h.accountId)!;
          const valueCny = convertToCNY(h.marketValue, account.currency, rates);
          // shares 模式：cost 是平均每股成本，总成本 = cost × shares
          // amount 模式：cost 就是总成本
          const holdingTotalCost = h.valuationMode === "shares" ? h.cost * h.shares : h.cost;
          const returnRate =
            holdingTotalCost > 0
              ? roundForStorage(
                  ((h.marketValue - holdingTotalCost) / holdingTotalCost) * 100,
                  "percent"
                )
              : null;
          const pnlAmount =
            holdingTotalCost > 0 ? roundForStorage(h.marketValue - holdingTotalCost, "amount") : 0;
          const totalCostCny = convertToCNY(holdingTotalCost, account.currency, rates);
          const pnlAmountCny =
            holdingTotalCost > 0 ? roundForStorage(valueCny - totalCostCny, "amount") : 0;
          return {
            id: h.id,
            name: h.name,
            accountId: h.accountId,
            accountName: account.name,
            currency: account.currency,
            cost: holdingTotalCost,
            marketValue: h.marketValue,
            marketValueCny: roundForStorage(valueCny, "amount"),
            returnRate,
            pnlAmount: roundForStorage(pnlAmount, "amount"),
            pnlAmountCny: roundForStorage(pnlAmountCny, "amount"),
            pctOfTotal:
              totalAssetCny > 0
                ? roundForStorage((valueCny / totalAssetCny) * 100, "percent")
                : 0,
          };
        });

    // Category-level cost, P&L, and rebalance adjustment
    const totalCost = isCash
      ? 0
      : holdingsList.reduce((s: number, h: any) => s + convertToCNY(h.cost, h.currency, rates), 0);
    const totalPnl = isCash ? 0 : roundForStorage(actualValue - totalCost, "amount");
    const adjustAmount = roundForStorage(
      (cls.targetPct / 100) * totalAssetCny - actualValue,
      "amount"
    );

    return {
      id: cls.id,
      name: cls.name,
      targetPct: cls.targetPct,
      actualPct,
      actualValue: roundForStorage(actualValue, "amount"),
      deviation,
      status,
      adjustAmount,
      totalCost: roundForStorage(totalCost, "amount"),
      totalPnl,
      holdings: holdingsList,
    };
  });

  return NextResponse.json({
    totalAssetCny: roundForStorage(totalAssetCny, "amount"),
    allocation,
    rates: ratesResult,
    settings: { warningThreshold, dangerThreshold, colorMode },
  });
}
