import test from "node:test";
import assert from "node:assert/strict";

import {
  computeTwrPerformance,
  resolvePerformanceStartDate,
} from "../../src/lib/services/performance-calculation.ts";

test("zero cash flow returns market value return", () => {
  const result = computeTwrPerformance(
    [
      { date: "2026-01-01", value: 100 },
      { date: "2026-01-02", value: 110 },
      { date: "2026-01-03", value: 121 },
    ],
    []
  );

  assert.equal(result.series.at(-1)?.cumulativeTwr, 0.21);
  assert.equal(result.summary.cumulativeTwr, 0.21);
  assert.equal(result.summary.annualizedTwr, null);
});

test("deposit and withdraw are excluded from performance", () => {
  const result = computeTwrPerformance(
    [
      { date: "2026-01-01", value: 100 },
      { date: "2026-01-02", value: 160 },
      { date: "2026-01-03", value: 148 },
    ],
    [
      { date: "2026-01-02", amountCny: 50 },
      { date: "2026-01-03", amountCny: -20 },
    ]
  );

  assert.equal(result.series[1].cumulativeTwr, 0.1);
  assert.equal(result.series[2].cumulativeTwr, 0.155);
});

test("sparse snapshots align all interval cash flows to the right endpoint", () => {
  const result = computeTwrPerformance(
    [
      { date: "2026-01-01", value: 100 },
      { date: "2026-01-10", value: 115 },
    ],
    [
      { date: "2026-01-03", amountCny: 10 },
      { date: "2026-01-08", amountCny: -5 },
    ]
  );

  assert.equal(result.series[1].cumulativeTwr, 0.1);
});

test("start date resolution clamps to latest valid lower bound", () => {
  assert.deepEqual(resolvePerformanceStartDate("2026-01-01", "2025-12-01", null), {
    earliestDate: "2026-01-01",
    effectiveStartDate: "2026-01-01",
  });
  assert.deepEqual(resolvePerformanceStartDate("2026-01-01", "2026-02-01", "2026-01-15"), {
    earliestDate: "2026-01-01",
    effectiveStartDate: "2026-02-01",
  });
  assert.deepEqual(resolvePerformanceStartDate("2026-01-01", "not-a-date", "2026-01-15"), {
    earliestDate: "2026-01-01",
    effectiveStartDate: "2026-01-15",
  });
});

test("single point returns safe baseline without NaN or Infinity", () => {
  const result = computeTwrPerformance([{ date: "2026-01-01", value: 0 }], [
    { date: "2026-01-01", amountCny: 100 },
  ]);

  assert.deepEqual(result.series, [{ date: "2026-01-01", cumulativeTwr: 0, value: 0 }]);
  assert.deepEqual(result.summary, { cumulativeTwr: 0, annualizedTwr: null, days: 0 });
});
