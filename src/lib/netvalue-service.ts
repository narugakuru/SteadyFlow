/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accounts, assetClasses, holdings, netvalue, settings } from "@/db/schema";
import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/asset-class";
import { getExchangeRates, convertToCNY } from "@/lib/data-source/exchange-rate";
import { roundForStorage } from "@/lib/format";
import {
  DEFAULT_NETVALUE_TIMEZONE,
  getDateInTimeZone,
  normalizeNetvalueTimeZone,
} from "@/lib/timezone";

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

export function normalizeAllocationSnapshot(
  rows: { name: string; actualValue: number; actualPct: number }[]
) {
  const merged = new Map<string, { name: string; actualValue: number; actualPct: number }>();

  for (const row of rows) {
    const normalizedName = normalizeAssetClassName(row.name);
    const existing = merged.get(normalizedName);
    if (!existing) {
      merged.set(normalizedName, { ...row, name: normalizedName });
      continue;
    }
    existing.actualValue = roundForStorage(existing.actualValue + row.actualValue, "amount");
    existing.actualPct = roundForStorage(existing.actualPct + row.actualPct, "percent");
  }

  return sortByDefaultAssetClassOrder(
    Array.from(merged.values()).map((item, index) => ({
      ...item,
      sortOrder: getDefaultAssetClassOrderIndex(item.name),
      id: index,
    }))
  ).map(({ name, actualValue, actualPct }) => ({ name, actualValue, actualPct }));
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
  const allHoldings = rawHoldings.map((h: any) => ({
    ...h,
    assetClass: normalizeAssetClassName(h.assetClass),
  }));

  const rates = ratesResult.rates;
  const accountMap: Map<number, any> = new Map(allAccounts.map((a: any) => [a.id, a]));

  const accountHoldingsValue: Record<number, number> = {};
  for (const h of allHoldings) {
    accountHoldingsValue[h.accountId] = (accountHoldingsValue[h.accountId] || 0) + h.marketValue;
  }

  const totalAssetCny = allAccounts.reduce((sum: number, a: any) => {
    const accountValue = a.cashBalance + (accountHoldingsValue[a.id] || 0);
    return sum + convertToCNY(accountValue, a.currency, rates);
  }, 0);

  const classValues: Record<string, number> = {};
  for (const h of allHoldings) {
    const account = accountMap.get(h.accountId);
    if (!account) continue;
    const valueCny = convertToCNY(h.marketValue, account.currency, rates);
    classValues[h.assetClass] = (classValues[h.assetClass] || 0) + valueCny;
  }

  const totalCashCny = allAccounts.reduce((sum: number, a: any) => {
    return sum + convertToCNY(a.cashBalance, a.currency, rates);
  }, 0);

  const mergedClasses = new Map<string, any>();
  for (const cls of allClasses) {
    const normalizedName = normalizeAssetClassName(cls.name);
    const existing = mergedClasses.get(normalizedName);
    if (!existing) {
      mergedClasses.set(normalizedName, {
        ...cls,
        name: normalizedName,
      });
    } else {
      existing.targetPct = roundForStorage(existing.targetPct + cls.targetPct, "percent");
    }
  }

  const classesForSnapshot = sortByDefaultAssetClassOrder(Array.from(mergedClasses.values()));

  const data = {
    allocation: classesForSnapshot.map((cls: any) => {
      const actualValue = cls.name === "现金" ? totalCashCny : classValues[cls.name] || 0;
      const actualPct =
        totalAssetCny > 0 ? roundForStorage((actualValue / totalAssetCny) * 100, "percent") : 0;
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
