export interface DisciplineHoldingLike {
  id: number;
  marketValueCny: number;
  disciplineSortOrder?: number | null;
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
