import { roundForStorage } from "./format.ts";

export function calculateCumulativePnl(accountValue: number, principal: number): number {
  return roundForStorage(accountValue - principal, "amount");
}

export function calculateCumulativePnlPct(cumulativePnl: number, principal: number): number | null {
  if (!Number.isFinite(principal) || principal <= 0) {
    return null;
  }
  return roundForStorage((cumulativePnl / principal) * 100, "percent");
}

export function reverseLedgerDelta(currentValue: number, delta: number): number {
  return roundForStorage(currentValue - delta, "amount");
}

export function calculateFeeRealizedPnl(amount: number): number {
  return roundForStorage(-amount, "amount");
}
