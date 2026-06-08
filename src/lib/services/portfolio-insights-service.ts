/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertToCNY } from "@/lib/data-source/exchange-rate";
import { buildPortfolioSnapshot } from "@/lib/services/portfolio-snapshot-service";
import { roundForStorage } from "@/lib/utils/format";
import type {
  InsightsCompositionItem,
  InsightsHeatmapHolding,
  PortfolioInsightsData,
} from "@/lib/utils/types";

function calculatePct(valueCny: number, totalAssetCny: number) {
  if (!Number.isFinite(totalAssetCny) || totalAssetCny <= 0) return 0;
  return roundForStorage((valueCny / totalAssetCny) * 100, "percent");
}

function sortByValueDesc<T extends { valueCny: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => b.valueCny - a.valueCny || a.name.localeCompare(b.name));
}

export async function buildPortfolioInsights(userId: string): Promise<PortfolioInsightsData> {
  const snapshot = await buildPortfolioSnapshot(userId);
  const totalAssetCny = snapshot.summary.totalAssetCny;
  const rates = snapshot.raw.exchangeRates.rates;

  const currencyMap = new Map<string, InsightsCompositionItem>();
  for (const account of snapshot.derived.accountBreakdown) {
    const existing = currencyMap.get(account.currency);
    if (!existing) {
      currencyMap.set(account.currency, {
        id: account.currency,
        name: account.currency,
        currency: account.currency,
        value: roundForStorage(account.accountValue, "amount"),
        valueCny: roundForStorage(account.accountValueCny, "amount"),
        pct: 0,
      });
      continue;
    }

    existing.value = roundForStorage(existing.value + account.accountValue, "amount");
    existing.valueCny = roundForStorage(existing.valueCny + account.accountValueCny, "amount");
  }

  const currencyComposition = sortByValueDesc(Array.from(currencyMap.values())).map((item) => ({
    ...item,
    pct: calculatePct(item.valueCny, totalAssetCny),
  }));

  const accountComposition = sortByValueDesc(
    snapshot.derived.accountBreakdown.map((account) => ({
      id: String(account.id),
      name: account.name,
      currency: account.currency,
      value: account.accountValue,
      valueCny: account.accountValueCny,
      pct: calculatePct(account.accountValueCny, totalAssetCny),
    }))
  );

  const assetClassComposition = snapshot.derived.allocation.map((item) => ({
    id: String(item.id),
    name: item.name,
    value: item.actualValue,
    valueCny: item.actualValue,
    pct: item.actualPct,
  }));

  const accountMap = new Map<number, any>(
    snapshot.raw.accounts.map((account: any) => [account.id, account])
  );
  const heatmapHoldings: InsightsHeatmapHolding[] = snapshot.raw.holdings
    .map((holding: any) => {
      const account = accountMap.get(holding.accountId);
      if (!account) return null;

      const holdingCost =
        holding.valuationMode === "shares" ? holding.cost * holding.shares : holding.cost;
      const marketValueCny = convertToCNY(holding.marketValue, account.currency, rates);
      if (marketValueCny <= 0) return null;

      const costCny = convertToCNY(holdingCost, account.currency, rates);
      const hasCost = Number.isFinite(holdingCost) && holdingCost > 0;
      const pnlAmount = hasCost ? roundForStorage(holding.marketValue - holdingCost, "amount") : 0;
      const pnlAmountCny = hasCost ? roundForStorage(marketValueCny - costCny, "amount") : 0;
      const returnRate = hasCost
        ? roundForStorage((pnlAmount / holdingCost) * 100, "percent")
        : null;

      return {
        id: holding.id,
        name: holding.name,
        ticker: holding.ticker,
        accountName: account.name,
        assetClass: holding.assetClass,
        currency: account.currency,
        valuationMode: holding.valuationMode,
        marketValue: holding.marketValue,
        marketValueCny: roundForStorage(marketValueCny, "amount"),
        pnlAmount,
        pnlAmountCny,
        returnRate,
      } satisfies InsightsHeatmapHolding;
    })
    .filter((holding): holding is InsightsHeatmapHolding => holding !== null)
    .sort((a, b) => b.marketValueCny - a.marketValueCny || a.name.localeCompare(b.name));

  return {
    summary: snapshot.summary,
    currencyComposition,
    accountComposition,
    assetClassComposition,
    heatmapHoldings,
    rates: snapshot.raw.exchangeRates,
    settings: snapshot.raw.settings,
  };
}
