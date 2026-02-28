/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, holdings, assetClasses, netvalue } from "@/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getExchangeRates, convertToCNY } from "@/lib/exchange-rate";
import { requireUser } from "@/lib/auth-utils";
import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/asset-class";
import { roundForStorage } from "@/lib/format";

function sortByDefaultAssetClassOrder<T extends { name: string; sortOrder?: number; id?: number }>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aOrder = getDefaultAssetClassOrderIndex(a.name);
    const bOrder = getDefaultAssetClassOrderIndex(b.name);
    if (aOrder !== bOrder) return aOrder - bOrder;

    if (aOrder === Number.MAX_SAFE_INTEGER) {
      const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return aSort - bSort || (a.id ?? 0) - (b.id ?? 0);
    }

    const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aSort - bSort || (a.id ?? 0) - (b.id ?? 0);
  });
}

function normalizeAllocationSnapshot(
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
      dataJson: (() => {
        const parsed = JSON.parse(r.dataJson);
        if (!Array.isArray(parsed?.allocation)) return parsed;
        return {
          ...parsed,
          allocation: normalizeAllocationSnapshot(parsed.allocation),
        };
      })(),
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
        .orderBy(asc(holdings.accountId), asc(holdings.sortOrder), asc(holdings.id))
    : [];
  const allHoldings = rawHoldings.map((h: any) => ({
    ...h,
    assetClass: normalizeAssetClassName(h.assetClass),
  }));

  const rates = ratesResult.rates;
  const accountMap: Map<number, any> = new Map(allAccounts.map((a: any) => [a.id, a]));

  // Calculate holdings value per account
  const accountHoldingsValue: Record<number, number> = {};
  for (const h of allHoldings) {
    accountHoldingsValue[h.accountId] = (accountHoldingsValue[h.accountId] || 0) + h.marketValue;
  }

  // Total asset = Σ(cashBalance + holdingsValue) per account in CNY
  const totalAssetCny = allAccounts.reduce((sum: number, a: any) => {
    const accountValue = a.cashBalance + (accountHoldingsValue[a.id] || 0);
    return sum + convertToCNY(accountValue, a.currency, rates);
  }, 0);

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

  // Upsert today's netvalue
  const [existing] = await db
    .select()
    .from(netvalue)
    .where(and(eq(netvalue.userId, userId), eq(netvalue.date, today)));

  if (existing) {
    await db
      .update(netvalue)
      .set({
        totalAssetCny: roundForStorage(totalAssetCny, "amount"),
        dataJson: JSON.stringify(data),
      })
      .where(and(eq(netvalue.userId, userId), eq(netvalue.date, today)));
  } else {
    await db.insert(netvalue).values({
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
