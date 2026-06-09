"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isNetvalueChartRange } from "@/lib/services/netvalue-history-helpers";
import type { NetvalueChartRange } from "@/lib/utils/types";

const DASHBOARD_TREND_RANGE_STORAGE_KEY = "steadyflow.dashboard-trend-range";
const DEFAULT_DASHBOARD_TREND_RANGE: NetvalueChartRange = "30d";

let currentTrendRange: NetvalueChartRange | null = null;
const listeners = new Set<() => void>();

function normalizeTrendRange(value: unknown): NetvalueChartRange {
  return typeof value === "string" && isNetvalueChartRange(value)
    ? value
    : DEFAULT_DASHBOARD_TREND_RANGE;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function readDashboardTrendRangePreference(): NetvalueChartRange {
  if (typeof window === "undefined") {
    return DEFAULT_DASHBOARD_TREND_RANGE;
  }

  try {
    return normalizeTrendRange(window.localStorage.getItem(DASHBOARD_TREND_RANGE_STORAGE_KEY));
  } catch {
    return DEFAULT_DASHBOARD_TREND_RANGE;
  }
}

export function writeDashboardTrendRangePreference(value: NetvalueChartRange) {
  currentTrendRange = normalizeTrendRange(value);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DASHBOARD_TREND_RANGE_STORAGE_KEY, currentTrendRange);
    } catch {
      // Ignore storage write failures and keep in-memory state.
    }
  }

  emitChange();
}

function getSnapshot(): NetvalueChartRange {
  if (currentTrendRange == null) {
    currentTrendRange = readDashboardTrendRangePreference();
  }

  return currentTrendRange;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== DASHBOARD_TREND_RANGE_STORAGE_KEY) {
      return;
    }

    currentTrendRange = normalizeTrendRange(event.newValue);
    emitChange();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useDashboardTrendRangePreference() {
  const trendRange = useSyncExternalStore<NetvalueChartRange>(
    subscribe,
    getSnapshot,
    () => DEFAULT_DASHBOARD_TREND_RANGE
  );
  const setTrendRange = useCallback((nextValue: NetvalueChartRange) => {
    writeDashboardTrendRangePreference(nextValue);
  }, []);

  return [trendRange, setTrendRange] as const;
}
