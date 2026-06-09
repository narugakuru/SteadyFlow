import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIndexSnapshotFromHistory,
  calculateAthDrawdownFromHistory,
} from "../../src/lib/data-source/market-helpers.ts";
import { getVixSentimentLevel } from "../../src/lib/visualization/vix-sentiment.ts";

const snapshotConfig = {
  id: "sp500",
  symbol: "^spx",
  name: "S&P 500",
  group: "🇺🇸 美股",
  provider: "history",
  sourceSymbol: "^spx",
  externalUrl: "",
};

test("buildIndexSnapshotFromHistory derives latest price and previous-close change", () => {
  const snapshot = buildIndexSnapshotFromHistory(snapshotConfig, [
    { date: "2026-03-18", open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { date: "2026-03-19", open: 100, high: 103, low: 99, close: 102, volume: 1 },
    { date: "2026-03-20", open: 102, high: 106, low: 101, close: 105, volume: 1 },
  ]);

  assert.deepEqual(snapshot, {
    id: "sp500",
    symbol: "^spx",
    name: "S&P 500",
    price: 105,
    change: 3,
    changePercent: 2.9412,
    updatedAt: "2026-03-20T00:00:00",
    group: "🇺🇸 美股",
    source: "history",
    externalUrl: "",
  });
});

test("calculateAthDrawdownFromHistory prefers the latest date when ATH repeats", () => {
  const result = calculateAthDrawdownFromHistory([
    { date: "2026-03-17", open: 95, high: 100, low: 94, close: 100, volume: 1 },
    { date: "2026-03-18", open: 98, high: 99, low: 96, close: 98, volume: 1 },
    { date: "2026-03-19", open: 99, high: 100, low: 98, close: 100, volume: 1 },
    { date: "2026-03-20", open: 91.5, high: 92, low: 90, close: 91.5, volume: 1 },
  ]);

  assert.deepEqual(result, {
    lastAllTimeHighDate: "2026-03-19",
    drawdownPercent: -8.5,
    statusEmoji: "🐻",
  });
});

test("calculateAthDrawdownFromHistory returns nulls for empty history", () => {
  assert.deepEqual(calculateAthDrawdownFromHistory([]), {
    lastAllTimeHighDate: null,
    drawdownPercent: null,
    statusEmoji: null,
  });
});

test("getVixSentimentLevel returns the matching simplified range", () => {
  assert.equal(getVixSentimentLevel(24)?.label, "波动加剧");
  assert.equal(getVixSentimentLevel(24)?.range, "20 - 30");
});

test("getVixSentimentLevel returns null for missing values", () => {
  assert.equal(getVixSentimentLevel(undefined), null);
  assert.equal(getVixSentimentLevel(null), null);
});
