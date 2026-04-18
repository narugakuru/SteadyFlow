"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { DisplayCurrencyMode } from "@/lib/utils/types";

const DISPLAY_CURRENCY_STORAGE_KEY = "steadyflow.display-currency";
const DISPLAY_CURRENCY_VALUES: DisplayCurrencyMode[] = ["default", "USD", "CNY", "HKD"];

let currentDisplayCurrency: DisplayCurrencyMode | null = null;
const listeners = new Set<() => void>();

function isDisplayCurrencyMode(value: unknown): value is DisplayCurrencyMode {
  return (
    typeof value === "string" && DISPLAY_CURRENCY_VALUES.includes(value as DisplayCurrencyMode)
  );
}

function normalizeDisplayCurrency(value: unknown): DisplayCurrencyMode {
  return isDisplayCurrencyMode(value) ? value : "default";
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function readDisplayCurrencyPreference(): DisplayCurrencyMode {
  if (typeof window === "undefined") {
    return "default";
  }

  try {
    const storedValue = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    return normalizeDisplayCurrency(storedValue);
  } catch {
    return "default";
  }
}

export function writeDisplayCurrencyPreference(value: DisplayCurrencyMode) {
  currentDisplayCurrency = normalizeDisplayCurrency(value);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currentDisplayCurrency);
    } catch {
      // Ignore storage write failures and keep in-memory state.
    }
  }

  emitChange();
}

function getSnapshot(): DisplayCurrencyMode {
  if (currentDisplayCurrency == null) {
    currentDisplayCurrency = readDisplayCurrencyPreference();
  }

  return currentDisplayCurrency;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== DISPLAY_CURRENCY_STORAGE_KEY) {
      return;
    }

    currentDisplayCurrency = normalizeDisplayCurrency(event.newValue);
    emitChange();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useDisplayCurrencyPreference() {
  const displayCurrency = useSyncExternalStore<DisplayCurrencyMode>(
    subscribe,
    getSnapshot,
    () => "default"
  );
  const setDisplayCurrency = useCallback((nextValue: DisplayCurrencyMode) => {
    writeDisplayCurrencyPreference(nextValue);
  }, []);

  return [displayCurrency, setDisplayCurrency] as const;
}
