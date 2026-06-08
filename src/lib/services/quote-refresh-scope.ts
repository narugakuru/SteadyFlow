export interface QuoteRefreshScopeHoldingLike {
  valuationMode?: "amount" | "shares" | string | null;
  shares?: number | null;
}

export function getQuoteRefreshScopeSkipReason(
  holding: QuoteRefreshScopeHoldingLike
): string | null {
  if (holding.valuationMode !== "shares") return "amount 模式";

  const shares = holding.shares ?? 0;
  if (!Number.isFinite(shares) || shares <= 0) return "未持有";

  return null;
}
