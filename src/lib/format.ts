export const PRECISION = {
  amount: { display: 2, storage: 4 },
  percent: { display: 2, storage: 4 },
  price: { display: 3, storage: 4 },
  shares: { display: 4, storage: 4 },
  rate: { display: 4, storage: 4 },
} as const;

type PrecisionCategory = keyof typeof PRECISION;

export function formatNumber(value: number, maxDecimals: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Number(safeValue.toFixed(maxDecimals));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return normalized.toLocaleString("en-US", {
    maximumFractionDigits: maxDecimals,
  });
}

export function formatAmount(value: number): string {
  return formatNumber(value, PRECISION.amount.display);
}

export function formatPercent(value: number): string {
  return formatNumber(value, PRECISION.percent.display);
}

export function formatPrice(value: number): string {
  return formatNumber(value, PRECISION.price.display);
}

export function formatShares(value: number): string {
  return formatNumber(value, PRECISION.shares.display);
}

export function formatRate(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toFixed(PRECISION.rate.display);
}

export function roundForStorage(
  value: number,
  category: PrecisionCategory = "amount"
): number {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Number(safeValue.toFixed(PRECISION[category].storage));
}
