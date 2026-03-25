import { roundForStorage } from "@/lib/utils/format";
import {
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  type CurrencyCode,
  type DisplayCurrencyMode,
} from "@/lib/utils/types";

export function getSummaryCurrency(displayCurrency: DisplayCurrencyMode): CurrencyCode {
  return displayCurrency === "default" ? "CNY" : displayCurrency;
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function getDisplayCurrencyLabel(displayCurrency: DisplayCurrencyMode): string {
  if (displayCurrency === "default") {
    return "默认";
  }

  return CURRENCY_LABELS[displayCurrency] || displayCurrency;
}

export function convertToCny(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === "CNY") {
    return roundForStorage(amount, "amount");
  }

  const pair = `${currency}/CNY`;
  const rate = rates[pair] ?? 1;
  return roundForStorage(amount * rate, "amount");
}

export function convertFromCny(
  amountCny: number,
  targetCurrency: CurrencyCode,
  rates: Record<string, number>
): number {
  if (targetCurrency === "CNY") {
    return roundForStorage(amountCny, "amount");
  }

  const pair = `${targetCurrency}/CNY`;
  const rate = rates[pair] ?? 1;
  if (rate === 0) {
    return roundForStorage(amountCny, "amount");
  }

  return roundForStorage(amountCny / rate, "amount");
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  targetCurrency: CurrencyCode,
  rates: Record<string, number>
): number {
  if (fromCurrency === targetCurrency) {
    return roundForStorage(amount, "amount");
  }

  const amountCny = convertToCny(amount, fromCurrency, rates);
  return convertFromCny(amountCny, targetCurrency, rates);
}

export function getDisplayAmount(
  amount: number,
  sourceCurrency: string,
  displayCurrency: DisplayCurrencyMode,
  rates: Record<string, number>
): { amount: number; currency: CurrencyCode | string } {
  if (displayCurrency === "default") {
    return {
      amount: roundForStorage(amount, "amount"),
      currency: sourceCurrency,
    };
  }

  return {
    amount: convertCurrency(amount, sourceCurrency, displayCurrency, rates),
    currency: displayCurrency,
  };
}
