import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { accounts, holdings } from "@/db/schema";
import { normalizeAssetClassName } from "@/lib/utils/asset-class";
import type { Holding } from "@/lib/utils/types";

function getCompatibleDisciplineAssetClasses(assetClass?: string): string[] | null {
  if (!assetClass) return null;

  const normalizedAssetClass = normalizeAssetClassName(assetClass);
  return normalizedAssetClass === "股票" ? ["股票", "股票基金"] : [normalizedAssetClass];
}

export function getDisciplineVisibleMarketValueSql() {
  return sql<number>`
    case
      when ${holdings.valuationMode} = 'shares'
        then coalesce(${holdings.shares}, 0) * coalesce(${holdings.price}, 0)
      else coalesce(${holdings.marketValue}, 0)
    end
  `;
}

export async function listVisibleDisciplineHoldings(
  userId: string,
  assetClass?: string
): Promise<Holding[]> {
  const compatibleAssetClasses = getCompatibleDisciplineAssetClasses(assetClass);
  const conditions = [
    eq(accounts.userId, userId),
    sql`${getDisciplineVisibleMarketValueSql()} <> 0`,
  ];

  if (compatibleAssetClasses) {
    conditions.push(inArray(holdings.assetClass, compatibleAssetClasses));
  }

  const rows = await db
    .select({ holding: holdings })
    .from(holdings)
    .innerJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(and(...conditions))
    .orderBy(asc(holdings.disciplineSortOrder), asc(holdings.id));

  return rows.map((row: { holding: Holding }) => ({
    ...row.holding,
    assetClass: normalizeAssetClassName(row.holding.assetClass),
  }));
}
