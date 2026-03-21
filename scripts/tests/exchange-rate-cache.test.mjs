import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EXCHANGE_RATES,
  getFallbackExchangeRateResult,
  getFreshExchangeRateResult,
  isExchangeRateFresh,
} from "../../src/lib/services/exchange-rate-cache.ts";

test("isExchangeRateFresh returns true for same-day cache entries", () => {
  assert.equal(
    isExchangeRateFresh("2026-03-21T08:00:00.000Z", new Date("2026-03-21T23:59:59.000Z")),
    true
  );
});

test("getFreshExchangeRateResult returns cache payload when both pairs are fresh", () => {
  const result = getFreshExchangeRateResult(
    {
      "USD/CNY": { rate: 7.21, updatedAt: "2026-03-21T01:00:00.000Z" },
      "HKD/CNY": { rate: 0.93, updatedAt: "2026-03-21T02:00:00.000Z" },
    },
    new Date("2026-03-21T12:00:00.000Z")
  );

  assert.deepEqual(result, {
    rates: {
      "USD/CNY": 7.21,
      "HKD/CNY": 0.93,
    },
    updatedAt: "2026-03-21T01:00:00.000Z",
    source: "cache",
  });
});

test("getFreshExchangeRateResult returns null when cache is stale and should be refreshed", () => {
  const result = getFreshExchangeRateResult(
    {
      "USD/CNY": { rate: 7.21, updatedAt: "2026-03-20T23:59:59.000Z" },
      "HKD/CNY": { rate: 0.93, updatedAt: "2026-03-21T02:00:00.000Z" },
    },
    new Date("2026-03-21T12:00:00.000Z")
  );

  assert.equal(result, null);
});

test("getFallbackExchangeRateResult uses stale cache when external source is unavailable", () => {
  const result = getFallbackExchangeRateResult({
    "USD/CNY": { rate: 7.18, updatedAt: "2026-03-20T08:00:00.000Z" },
    "HKD/CNY": { rate: 0.92, updatedAt: "2026-03-20T08:00:00.000Z" },
  });

  assert.deepEqual(result, {
    rates: {
      "USD/CNY": 7.18,
      "HKD/CNY": 0.92,
    },
    updatedAt: "2026-03-20T08:00:00.000Z",
    source: "stale_cache",
  });
});

test("getFallbackExchangeRateResult falls back to defaults when cache is empty", () => {
  const result = getFallbackExchangeRateResult({});

  assert.deepEqual(result, {
    rates: DEFAULT_EXCHANGE_RATES,
    updatedAt: "default",
    source: "default",
  });
});
