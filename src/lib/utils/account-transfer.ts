import { roundForStorage } from "./format.ts";
import type { CurrencyCode } from "./types.ts";

export interface AccountTransferPlan {
  fromAmount: number;
  toAmount: number;
  fromDelta: number;
  toDelta: number;
}

export function calculateAccountTransfer(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rawFromAmount: unknown,
  rawToAmount: unknown
): AccountTransferPlan {
  const parsedFromAmount = Number(rawFromAmount);
  const parsedToAmount = Number(rawToAmount);
  if (!Number.isFinite(parsedFromAmount) || parsedFromAmount <= 0) {
    throw new Error("转出金额必须大于0");
  }
  if (fromCurrency !== toCurrency && (!Number.isFinite(parsedToAmount) || parsedToAmount <= 0)) {
    throw new Error("到账金额必须大于0");
  }

  const fromAmount = roundForStorage(parsedFromAmount, "amount");
  const toAmount =
    fromCurrency === toCurrency ? fromAmount : roundForStorage(parsedToAmount, "amount");
  return {
    fromAmount,
    toAmount,
    fromDelta: roundForStorage(-fromAmount, "amount"),
    toDelta: toAmount,
  };
}

export function reverseAccountTransferDelta(currentValue: number, delta: number): number {
  return roundForStorage(currentValue - delta, "amount");
}
