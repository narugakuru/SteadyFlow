/* eslint-disable @typescript-eslint/no-explicit-any */
import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accounts, assetClasses, holdings } from "@/db/schema";
import { getExchangeRates, convertToCNY } from "@/lib/data-source/exchange-rate";
import {
  filterVisibleDisciplineHoldings,
  isZeroDisciplineHoldingValue,
} from "@/lib/services/discipline-holdings";
import { listVisibleDisciplineHoldings } from "@/lib/services/discipline-holdings-query";
import { getQuoteSyncMetadataFromMap } from "@/lib/services/quote-sync-metadata-service";
import {
  getPublicUserSettingsFromMap,
  readUserSettingsMap,
  type PublicUserSettings,
} from "@/lib/services/settings-service";
import { getDefaultAssetClassOrderIndex, normalizeAssetClassName } from "@/lib/utils/asset-class";
import { roundForStorage } from "@/lib/utils/format";
import type { AllocationData, AllocationHolding, AllocationItem } from "@/lib/utils/types";
import type { QuoteSyncMetadata } from "@/lib/utils/quote-sync";

export interface PortfolioAccountBreakdown {
  id: number;
  name: string;
  currency: "CNY" | "USD" | "HKD";
  sortOrder: number;
  cashBalance: number;
  cashCny: number;
  holdingsValue: number;
  holdingsValueCny: number;
  accountValue: number;
  accountValueCny: number;
  realizedPnl: number;
  realizedPnlCny: number;
  holdingsPnl: number;
  holdingsPnlCny: number;
  holdingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioExportSnapshot {
  meta: {
    schemaVersion: string;
    generatedAt: string;
    quoteSync: QuoteSyncMetadata;
  };
  summary: {
    totalAssetCny: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
  };
  raw: {
    accounts: any[];
    holdings: any[];
    assetClasses: any[];
    exchangeRates: AllocationData["rates"];
    settings: PublicUserSettings;
  };
  derived: {
    allocation: AllocationData["allocation"];
    accountBreakdown: PortfolioAccountBreakdown[];
  };
}

export interface PortfolioDecisionSnapshot {
  meta: {
    schemaVersion: string;
    generatedAt: string;
    quoteSync: QuoteSyncMetadata;
    detail: "decision";
  };
  summary: PortfolioExportSnapshot["summary"];
  allocation: AllocationData["allocation"];
}

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

export async function buildPortfolioSnapshot(userId: string): Promise<PortfolioExportSnapshot> {
  const generatedAt = new Date().toISOString();
  const [ratesResult, allAccounts, allClasses, settingMap, visibleDisciplineHoldings] =
    await Promise.all([
      getExchangeRates(),
      db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .orderBy(asc(accounts.sortOrder), asc(accounts.id)),
      db
        .select()
        .from(assetClasses)
        .where(eq(assetClasses.userId, userId))
        .orderBy(asc(assetClasses.sortOrder), asc(assetClasses.id)),
      readUserSettingsMap(userId),
      listVisibleDisciplineHoldings(userId),
    ]);

  const accountIds = allAccounts.map((account: any) => account.id);
  const rawHoldings = accountIds.length
    ? await db
        .select()
        .from(holdings)
        .where(inArray(holdings.accountId, accountIds))
        .orderBy(asc(holdings.disciplineSortOrder), asc(holdings.id))
    : [];
  const normalizedHoldings = rawHoldings.map((holding: any) => ({
    ...holding,
    assetClass: normalizeAssetClassName(holding.assetClass),
  }));
  const exportableHoldings = normalizedHoldings.filter(
    (holding: any) => !isZeroDisciplineHoldingValue(holding)
  );

  const publicSettings = getPublicUserSettingsFromMap(settingMap);
  const quoteSync = getQuoteSyncMetadataFromMap(settingMap);
  const rates = ratesResult.rates;
  const accountMap = new Map<number, any>(allAccounts.map((account: any) => [account.id, account]));

  const accountHoldingsValue: Record<number, number> = {};
  const accountHoldingsCost: Record<number, number> = {};
  const accountHoldingsValueCny: Record<number, number> = {};
  const accountHoldingsCostCny: Record<number, number> = {};
  const accountHoldingsCount: Record<number, number> = {};
  const classHoldings: Record<string, typeof normalizedHoldings> = {};
  const visibleClassHoldings: Record<string, typeof visibleDisciplineHoldings> = {};
  const classValues: Record<string, number> = {};

  for (const holdingRow of normalizedHoldings) {
    const account = accountMap.get(holdingRow.accountId);
    if (!account) continue;

    const holdingTotalCost =
      holdingRow.valuationMode === "shares" ? holdingRow.cost * holdingRow.shares : holdingRow.cost;
    const valueCny = convertToCNY(holdingRow.marketValue, account.currency, rates);
    const costCny = convertToCNY(holdingTotalCost, account.currency, rates);

    accountHoldingsValue[holdingRow.accountId] =
      (accountHoldingsValue[holdingRow.accountId] || 0) + holdingRow.marketValue;
    accountHoldingsCost[holdingRow.accountId] =
      (accountHoldingsCost[holdingRow.accountId] || 0) + holdingTotalCost;
    accountHoldingsValueCny[holdingRow.accountId] =
      (accountHoldingsValueCny[holdingRow.accountId] || 0) + valueCny;
    accountHoldingsCostCny[holdingRow.accountId] =
      (accountHoldingsCostCny[holdingRow.accountId] || 0) + costCny;
    accountHoldingsCount[holdingRow.accountId] =
      (accountHoldingsCount[holdingRow.accountId] || 0) + 1;

    classValues[holdingRow.assetClass] = (classValues[holdingRow.assetClass] || 0) + valueCny;
    if (!classHoldings[holdingRow.assetClass]) {
      classHoldings[holdingRow.assetClass] = [];
    }
    classHoldings[holdingRow.assetClass].push(holdingRow);
  }

  for (const holdingRow of visibleDisciplineHoldings) {
    if (!visibleClassHoldings[holdingRow.assetClass]) {
      visibleClassHoldings[holdingRow.assetClass] = [];
    }
    visibleClassHoldings[holdingRow.assetClass].push(holdingRow);
  }

  const totalAssetCny = allAccounts.reduce((sum: number, account: any) => {
    const accountValue = account.cashBalance + (accountHoldingsValue[account.id] || 0);
    return sum + convertToCNY(accountValue, account.currency, rates);
  }, 0);

  const accountCash = allAccounts.map((account: any) => {
    const cashCny = convertToCNY(account.cashBalance, account.currency, rates);
    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      cash: account.cashBalance,
      cashCny: roundForStorage(cashCny, "amount"),
    };
  });
  const totalCashCny = accountCash.reduce(
    (sum: number, account: (typeof accountCash)[number]) => sum + account.cashCny,
    0
  );

  const mergedClasses = new Map<string, any>();
  for (const assetClassRow of allClasses) {
    const normalizedName = normalizeAssetClassName(assetClassRow.name);
    const existing = mergedClasses.get(normalizedName);
    if (!existing) {
      mergedClasses.set(normalizedName, {
        ...assetClassRow,
        name: normalizedName,
      });
      continue;
    }
    existing.targetPct = roundForStorage(existing.targetPct + assetClassRow.targetPct, "percent");
  }

  const classesForAllocation = sortByDefaultAssetClassOrder(Array.from(mergedClasses.values()));
  const allocation: AllocationItem[] = classesForAllocation.map((assetClassRow: any) => {
    const isCash = assetClassRow.name === "现金";
    const actualValue = isCash ? totalCashCny : classValues[assetClassRow.name] || 0;
    const actualPct =
      totalAssetCny > 0 ? roundForStorage((actualValue / totalAssetCny) * 100, "percent") : 0;
    const deviation = roundForStorage(actualPct - assetClassRow.targetPct, "percent");
    const absDeviation = Math.abs(deviation);

    let status: "normal" | "warning" | "danger" = "normal";
    if (absDeviation >= publicSettings.dangerThreshold) {
      status = "danger";
    } else if (absDeviation >= publicSettings.warningThreshold) {
      status = "warning";
    }

    const rawHoldingsList = isCash ? [] : classHoldings[assetClassRow.name] || [];
    const visibleHoldingsList = isCash ? [] : visibleClassHoldings[assetClassRow.name] || [];
    const holdingsList: AllocationHolding[] = isCash
      ? accountCash.map((accountCashRow: (typeof accountCash)[number]) => ({
          id: -accountCashRow.accountId,
          name: `${accountCashRow.accountName} 现金`,
          accountId: accountCashRow.accountId,
          accountName: accountCashRow.accountName,
          currency: accountCashRow.currency,
          cost: accountCashRow.cash,
          marketValue: accountCashRow.cash,
          marketValueCny: accountCashRow.cashCny,
          returnRate: null as number | null,
          pnlAmount: 0,
          pnlAmountCny: 0,
          disciplineSortOrder: null,
          pctOfTotal:
            totalAssetCny > 0
              ? roundForStorage((accountCashRow.cashCny / totalAssetCny) * 100, "percent")
              : 0,
        }))
      : visibleHoldingsList.map((holdingRow: any) => {
          const account = accountMap.get(holdingRow.accountId)!;
          const valueCny = convertToCNY(holdingRow.marketValue, account.currency, rates);
          const holdingTotalCost =
            holdingRow.valuationMode === "shares"
              ? holdingRow.cost * holdingRow.shares
              : holdingRow.cost;
          const returnRate =
            holdingTotalCost > 0
              ? roundForStorage(
                  ((holdingRow.marketValue - holdingTotalCost) / holdingTotalCost) * 100,
                  "percent"
                )
              : null;
          const pnlAmount =
            holdingTotalCost > 0
              ? roundForStorage(holdingRow.marketValue - holdingTotalCost, "amount")
              : 0;
          const totalCostCny = convertToCNY(holdingTotalCost, account.currency, rates);
          const pnlAmountCny =
            holdingTotalCost > 0 ? roundForStorage(valueCny - totalCostCny, "amount") : 0;

          return {
            id: holdingRow.id,
            name: holdingRow.name,
            accountId: holdingRow.accountId,
            accountName: account.name,
            currency: account.currency,
            cost: holdingTotalCost,
            marketValue: holdingRow.marketValue,
            marketValueCny: roundForStorage(valueCny, "amount"),
            returnRate,
            pnlAmount,
            pnlAmountCny,
            disciplineSortOrder: holdingRow.disciplineSortOrder,
            pctOfTotal:
              totalAssetCny > 0 ? roundForStorage((valueCny / totalAssetCny) * 100, "percent") : 0,
          };
        });
    const totalCost = isCash
      ? 0
      : rawHoldingsList.reduce((sum: number, holdingRow: any) => {
          const account = accountMap.get(holdingRow.accountId);
          if (!account) return sum;

          const holdingCost =
            holdingRow.valuationMode === "shares"
              ? holdingRow.cost * holdingRow.shares
              : holdingRow.cost;
          return sum + convertToCNY(holdingCost, account.currency, rates);
        }, 0);
    const totalPnl = isCash ? 0 : roundForStorage(actualValue - totalCost, "amount");
    const adjustAmount = roundForStorage(
      (assetClassRow.targetPct / 100) * totalAssetCny - actualValue,
      "amount"
    );
    const visibleAllocationHoldings = isCash
      ? filterVisibleDisciplineHoldings(holdingsList)
      : holdingsList;

    return {
      id: assetClassRow.id,
      name: assetClassRow.name,
      targetPct: assetClassRow.targetPct,
      actualPct,
      actualValue: roundForStorage(actualValue, "amount"),
      deviation,
      status,
      adjustAmount,
      totalCost: roundForStorage(totalCost, "amount"),
      totalPnl,
      holdings: visibleAllocationHoldings,
    };
  });

  const realizedPnl = allAccounts.reduce((sum: number, account: any) => {
    return sum + convertToCNY(account.realizedPnl || 0, account.currency, rates);
  }, 0);
  const unrealizedPnl = allocation
    .filter((item) => item.name !== "现金")
    .reduce((sum, item) => sum + item.totalPnl, 0);
  const totalPnl = realizedPnl + unrealizedPnl;

  const accountBreakdown: PortfolioAccountBreakdown[] = allAccounts.map((account: any) => {
    const holdingsValue = roundForStorage(accountHoldingsValue[account.id] || 0, "amount");
    const holdingsValueCny = roundForStorage(accountHoldingsValueCny[account.id] || 0, "amount");
    const holdingsCostCny = roundForStorage(accountHoldingsCostCny[account.id] || 0, "amount");
    const holdingsPnl = roundForStorage(
      holdingsValue - (accountHoldingsCost[account.id] || 0),
      "amount"
    );
    const holdingsPnlCny = roundForStorage(holdingsValueCny - holdingsCostCny, "amount");
    const accountValue = roundForStorage(account.cashBalance + holdingsValue, "amount");
    const accountValueCny = roundForStorage(
      convertToCNY(account.cashBalance, account.currency, rates) + holdingsValueCny,
      "amount"
    );

    return {
      id: account.id,
      name: account.name,
      currency: account.currency,
      sortOrder: account.sortOrder,
      cashBalance: account.cashBalance,
      cashCny: roundForStorage(
        convertToCNY(account.cashBalance, account.currency, rates),
        "amount"
      ),
      holdingsValue,
      holdingsValueCny,
      accountValue,
      accountValueCny,
      realizedPnl: roundForStorage(account.realizedPnl || 0, "amount"),
      realizedPnlCny: roundForStorage(
        convertToCNY(account.realizedPnl || 0, account.currency, rates),
        "amount"
      ),
      holdingsPnl,
      holdingsPnlCny,
      holdingsCount: accountHoldingsCount[account.id] || 0,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  });

  return {
    meta: {
      schemaVersion: "portfolio-export.v1",
      generatedAt,
      quoteSync,
    },
    summary: {
      totalAssetCny: roundForStorage(totalAssetCny, "amount"),
      realizedPnl: roundForStorage(realizedPnl, "amount"),
      unrealizedPnl: roundForStorage(unrealizedPnl, "amount"),
      totalPnl: roundForStorage(totalPnl, "amount"),
    },
    raw: {
      accounts: allAccounts.map((account: any) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        sortOrder: account.sortOrder,
        cashBalance: account.cashBalance,
        realizedPnl: account.realizedPnl,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
      holdings: exportableHoldings,
      assetClasses: sortByDefaultAssetClassOrder(
        allClasses.map((assetClassRow: any) => ({
          id: assetClassRow.id,
          name: normalizeAssetClassName(assetClassRow.name),
          targetPct: assetClassRow.targetPct,
          sortOrder: assetClassRow.sortOrder,
        }))
      ),
      exchangeRates: ratesResult,
      settings: publicSettings,
    },
    derived: {
      allocation,
      accountBreakdown,
    },
  };
}

export async function buildAllocationData(userId: string): Promise<AllocationData> {
  const snapshot = await buildPortfolioSnapshot(userId);

  return {
    totalAssetCny: snapshot.summary.totalAssetCny,
    realizedPnl: snapshot.summary.realizedPnl,
    unrealizedPnl: snapshot.summary.unrealizedPnl,
    totalPnl: snapshot.summary.totalPnl,
    allocation: snapshot.derived.allocation,
    rates: snapshot.raw.exchangeRates,
    settings: snapshot.raw.settings,
    quoteSync: snapshot.meta.quoteSync,
  };
}

export async function buildPortfolioDecisionSnapshot(
  userId: string
): Promise<PortfolioDecisionSnapshot> {
  const snapshot = await buildPortfolioSnapshot(userId);

  return {
    meta: {
      schemaVersion: snapshot.meta.schemaVersion,
      generatedAt: snapshot.meta.generatedAt,
      quoteSync: snapshot.meta.quoteSync,
      detail: "decision",
    },
    summary: snapshot.summary,
    allocation: snapshot.derived.allocation,
  };
}
