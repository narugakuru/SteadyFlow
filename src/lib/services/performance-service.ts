/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, eq, gt, gte, inArray, lte } from "drizzle-orm";

import { accounts, netvalue, transactions } from "@/db/schema";
import { convertToCNY, getExchangeRates } from "@/lib/data-source/exchange-rate";
import {
  computeTwrPerformance,
  resolvePerformanceStartDate,
  type CashFlowPoint,
  type MarketValuePoint,
} from "@/lib/services/performance-calculation";
import {
  aggregateNetvalueChartPoints,
  getNetvalueChartGrain,
  getNetvalueChartStartDate,
} from "@/lib/services/netvalue-history-helpers";
import { readUserSettingsMap, SETTING_KEYS } from "@/lib/services/settings-service";
import { roundForStorage } from "@/lib/utils/format";
import type { NetvalueChartRange, NetvaluePerformanceResponse } from "@/lib/utils/types";

export { isValidPerformanceStartDate } from "@/lib/services/performance-calculation";

async function getEarliestNetvalueDate(dbClient: any, userId: string) {
  const [row] = await dbClient
    .select({ date: netvalue.date })
    .from(netvalue)
    .where(eq(netvalue.userId, userId))
    .orderBy(asc(netvalue.date))
    .limit(1);

  return row?.date ?? null;
}

async function getMarketValuePoints(
  dbClient: any,
  userId: string,
  range: NetvalueChartRange,
  startDate: string | null
): Promise<MarketValuePoint[]> {
  if (!startDate) return [];

  const rows = await dbClient
    .select({
      id: netvalue.id,
      date: netvalue.date,
      totalAssetCny: netvalue.totalAssetCny,
      dataJson: netvalue.dataJson,
    })
    .from(netvalue)
    .where(and(eq(netvalue.userId, userId), gte(netvalue.date, startDate)))
    .orderBy(asc(netvalue.date));

  return aggregateNetvalueChartPoints(
    rows.map((row: { id: number; date: string; totalAssetCny: number; dataJson: string }) => ({
      id: row.id,
      date: row.date,
      totalAssetCny: row.totalAssetCny,
      dataJson: { allocation: [], rates: {} },
    })),
    getNetvalueChartGrain(range)
  ).map((point) => ({
    date: point.date,
    value: point.totalAssetCny,
  }));
}

export async function getExternalCashFlowsCny(
  dbClient: any,
  userId: string,
  fromExclusive: string,
  toInclusive: string
): Promise<CashFlowPoint[]> {
  const exchangeRateResult = await getExchangeRates();
  const rows = await dbClient
    .select({
      date: transactions.date,
      type: transactions.type,
      amount: transactions.amount,
      currency: accounts.currency,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(transactions.type, ["deposit", "withdraw"]),
        gt(transactions.date, fromExclusive),
        lte(transactions.date, toInclusive)
      )
    )
    .orderBy(asc(transactions.date));

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const signedAmount = row.type === "withdraw" ? -Number(row.amount) : Number(row.amount);
    const amountCny = convertToCNY(signedAmount, row.currency, exchangeRateResult.rates);
    byDate.set(row.date, roundForStorage((byDate.get(row.date) ?? 0) + amountCny, "amount"));
  }

  return Array.from(byDate.entries()).map(([date, amountCny]) => ({ date, amountCny }));
}

export async function getNetvaluePerformance(
  dbClient: any,
  userId: string,
  range: NetvalueChartRange,
  now = new Date()
): Promise<NetvaluePerformanceResponse> {
  const [earliestDate, settingMap] = await Promise.all([
    getEarliestNetvalueDate(dbClient, userId),
    readUserSettingsMap(userId),
  ]);
  const rangeStartDate = getNetvalueChartStartDate(range, now);
  const { effectiveStartDate } = resolvePerformanceStartDate(
    earliestDate,
    settingMap.get(SETTING_KEYS.performanceStartDate),
    rangeStartDate
  );

  const marketValues = await getMarketValuePoints(dbClient, userId, range, effectiveStartDate);
  if (marketValues.length < 2) {
    const result = computeTwrPerformance(marketValues, []);
    return {
      range,
      grain: getNetvalueChartGrain(range),
      startDate: marketValues[0]?.date ?? effectiveStartDate ?? earliestDate ?? "",
      ...result,
    };
  }

  const cashFlows = await getExternalCashFlowsCny(
    dbClient,
    userId,
    marketValues[0].date,
    marketValues.at(-1)?.date ?? marketValues[0].date
  );
  const result = computeTwrPerformance(marketValues, cashFlows);

  return {
    range,
    grain: getNetvalueChartGrain(range),
    startDate: result.series[0]?.date ?? effectiveStartDate ?? earliestDate ?? "",
    ...result,
  };
}
