export interface DisciplineHoldingLike {
  id: number;
  marketValueCny: number;
  disciplineSortOrder?: number | null;
}

export interface DisciplineValuationLike {
  valuationMode?: "amount" | "shares" | null;
  marketValue?: number | null;
  shares?: number | null;
  price?: number | null;
}

export function getEffectiveDisciplineMarketValue(holding: DisciplineValuationLike): number {
  if (holding.valuationMode === "shares") {
    return (holding.shares ?? 0) * (holding.price ?? 0);
  }
  return holding.marketValue ?? 0;
}

export function isZeroDisciplineHoldingValue(holding: DisciplineValuationLike): boolean {
  return getEffectiveDisciplineMarketValue(holding) === 0;
}

export function isZeroDisciplineAmount(valueCny: number): boolean {
  return valueCny === 0;
}

export function sortDisciplineHoldingsWithZeroLast<T extends DisciplineHoldingLike>(
  holdings: T[]
): T[] {
  return [...holdings].sort((a, b) => {
    const aZero = isZeroDisciplineAmount(a.marketValueCny);
    const bZero = isZeroDisciplineAmount(b.marketValueCny);
    if (aZero !== bZero) return aZero ? 1 : -1;

    const left = a.disciplineSortOrder ?? Number.MAX_SAFE_INTEGER;
    const right = b.disciplineSortOrder ?? Number.MAX_SAFE_INTEGER;
    return left - right || a.id - b.id;
  });
}

export function filterVisibleDisciplineHoldings<T extends { marketValueCny: number }>(
  holdings: T[]
): T[] {
  return holdings.filter((holding) => !isZeroDisciplineAmount(holding.marketValueCny));
}
