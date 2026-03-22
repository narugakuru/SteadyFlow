/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accounts, assetClasses, holdings, netvalue, settings } from "@/db/schema";
import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { getExchangeRates, convertToCNY } from "@/lib/data-source/exchange-rate";
import { roundForStorage } from "@/lib/utils/format";
import {
  DEFAULT_NETVALUE_TIMEZONE,
  getDateInTimeZone,
  normalizeNetvalueTimeZone,
} from "@/lib/utils/timezone";

function sortByDefaultAssetClassOrder<T extends { name: string; sortOrder?: number; id?: number }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aOrder = getDefaultAssetClassOrderIndex(a.name);
    const bOrder = getDefaultAssetClassOrderIndex(b.name);
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aSort - bSort || (a.id ?? 0) - (b.id ?? 0);
  });
}

export async function getUserNetvalueTimeZone(userId: string): Promise<string> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "netvalue.timezone")))
    .limit(1);
  return normalizeNetvalueTimeZone(row?.value);
}

export interface RecordTodayNetvalueOptions {
  now?: Date;
  timeZone?: string;
}

export async function recordTodayNetvalue(
  userId: string,
  options: RecordTodayNetvalueOptions = {}
) {
  const now = options.now ?? new Date();
  const resolvedTimeZone = normalizeNetvalueTimeZone(
    options.timeZone ?? (await getUserNetvalueTimeZone(userId))
  );
  const today = getDateInTimeZone(now, resolvedTimeZone);

  const [ratesResult, allAccounts, allClasses]: any[] = await Promise.all([
    getExchangeRates(),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db
      .select()
      .from(assetClasses)
      .where(eq(assetClasses.userId, userId))
      .orderBy(asc(assetClasses.sortOrder), asc(assetClasses.id)),
  ]);

  const accountIds = allAccounts.map((account: any) => account.id);
  const rawHoldings = accountIds.length
    ? await db
        .select()
        .from(holdings)
        .where(inArray(holdings.accountId, accountIds))
        .orderBy(asc(holdings.accountId), asc(holdings.accountSortOrder), asc(holdings.id))
    : [];
  const allHoldings = rawHoldings.map((holding: any) => ({
    ...holding,
    assetClass: normalizeAssetClassName(holding.assetClass),
  }));

  const rates = ratesResult.rates;
  const accountMap: Map<number, any> = new Map(
    allAccounts.map((account: any) => [account.id, account])
  );

  const accountHoldingsValue: Record<number, number> = {};
  for (const holding of allHoldings) {
    accountHoldingsValue[holding.accountId] =
      (accountHoldingsValue[holding.accountId] || 0) + holding.marketValue;
  }

  const totalAssetCny = allAccounts.reduce((sum: number, account: any) => {
    const accountValue = account.cashBalance + (accountHoldingsValue[account.id] || 0);
    return sum + convertToCNY(accountValue, account.currency, rates);
  }, 0);

  const classValues: Record<string, number> = {};
  for (const holding of allHoldings) {
    const account = accountMap.get(holding.accountId);
    if (!account) continue;
    const valueCny = convertToCNY(holding.marketValue, account.currency, rates);
    classValues[holding.assetClass] = (classValues[holding.assetClass] || 0) + valueCny;
  }

  const totalCashCny = allAccounts.reduce((sum: number, account: any) => {
    return sum + convertToCNY(account.cashBalance, account.currency, rates);
  }, 0);

  const mergedClasses = new Map<string, any>();
  for (const assetClass of allClasses) {
    const normalizedName = normalizeAssetClassName(assetClass.name);
    const existing = mergedClasses.get(normalizedName);
    if (!existing) {
      mergedClasses.set(normalizedName, {
        ...assetClass,
        name: normalizedName,
      });
    } else {
      existing.targetPct = roundForStorage(existing.targetPct + assetClass.targetPct, "percent");
    }
  }

  const classesForSnapshot = sortByDefaultAssetClassOrder(Array.from(mergedClasses.values()));

  const data = {
    allocation: classesForSnapshot.map((assetClass: any) => {
      const actualValue =
        assetClass.name === "现金" ? totalCashCny : classValues[assetClass.name] || 0;
      const actualPct =
        totalAssetCny > 0 ? roundForStorage((actualValue / totalAssetCny) * 100, "percent") : 0;
      return {
        name: assetClass.name,
        actualValue: roundForStorage(actualValue, "amount"),
        actualPct,
      };
    }),
    rates: ratesResult.rates,
  };

  const totalAssetRounded = roundForStorage(totalAssetCny, "amount");
  await db
    .insert(netvalue)
    .values({
      userId,
      date: today,
      totalAssetCny: totalAssetRounded,
      dataJson: JSON.stringify(data),
    })
    .onConflictDoUpdate({
      target: [netvalue.userId, netvalue.date],
      set: {
        totalAssetCny: totalAssetRounded,
        dataJson: JSON.stringify(data),
      },
    });

  return {
    date: today,
    totalAssetCny: totalAssetRounded,
    data,
    timeZone: resolvedTimeZone,
  };
}

export { DEFAULT_NETVALUE_TIMEZONE };
