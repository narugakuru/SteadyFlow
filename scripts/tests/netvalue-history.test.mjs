import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateNetvalueChartPoints,
  clampNetvaluePage,
  clampNetvaluePageSize,
  DEFAULT_NETVALUE_PAGE_SIZE,
  getNetvalueChartGrain,
  parseNetvalueDataJson,
  slimNetvalueDataJsonString,
} from "../../src/lib/services/netvalue-history-helpers.ts";

test("getNetvalueChartGrain returns the fixed range mapping", () => {
  assert.equal(getNetvalueChartGrain("30d"), "day");
  assert.equal(getNetvalueChartGrain("1y"), "week");
  assert.equal(getNetvalueChartGrain("all"), "month");
});

test("slimNetvalueDataJsonString removes legacy accounts snapshots", () => {
  const result = slimNetvalueDataJsonString(
    JSON.stringify({
      allocation: [{ name: "股票", actualValue: 100, actualPct: 50 }],
      accounts: [{ name: "账户A", currency: "CNY", totalCny: 100, cashCny: 10 }],
      rates: { "USD/CNY": 7.2 },
    })
  );

  assert.equal(
    result,
    JSON.stringify({
      allocation: [{ name: "股票", actualValue: 100, actualPct: 50 }],
      rates: { "USD/CNY": 7.2 },
    })
  );
});

test("parseNetvalueDataJson tolerates malformed payloads", () => {
  assert.deepEqual(parseNetvalueDataJson("not-json"), {
    allocation: [],
    rates: {},
  });
});

test("clampNetvaluePage and clampNetvaluePageSize normalize invalid inputs", () => {
  assert.equal(clampNetvaluePage(0), 1);
  assert.equal(clampNetvaluePage(2.9), 2);
  assert.equal(clampNetvaluePageSize(-1), DEFAULT_NETVALUE_PAGE_SIZE);
  assert.equal(clampNetvaluePageSize(999), 200);
});

test("aggregateNetvalueChartPoints keeps the last point of each ISO week", () => {
  const points = aggregateNetvalueChartPoints(
    [
      {
        id: 1,
        date: "2026-03-02",
        totalAssetCny: 100,
        dataJson: { allocation: [{ name: "股票", actualValue: 60, actualPct: 60 }], rates: {} },
      },
      {
        id: 2,
        date: "2026-03-06",
        totalAssetCny: 120,
        dataJson: { allocation: [{ name: "股票", actualValue: 70, actualPct: 58.3 }], rates: {} },
      },
      {
        id: 3,
        date: "2026-03-09",
        totalAssetCny: 130,
        dataJson: { allocation: [{ name: "股票", actualValue: 75, actualPct: 57.7 }], rates: {} },
      },
    ],
    "week"
  );

  assert.deepEqual(points, [
    {
      date: "2026-03-06",
      totalAssetCny: 120,
      allocation: [{ name: "股票", actualValue: 70, actualPct: 58.3 }],
    },
    {
      date: "2026-03-09",
      totalAssetCny: 130,
      allocation: [{ name: "股票", actualValue: 75, actualPct: 57.7 }],
    },
  ]);
});

test("aggregateNetvalueChartPoints keeps the last point of each month", () => {
  const points = aggregateNetvalueChartPoints(
    [
      {
        id: 1,
        date: "2026-02-01",
        totalAssetCny: 100,
        dataJson: { allocation: [{ name: "股票", actualValue: 60, actualPct: 60 }], rates: {} },
      },
      {
        id: 2,
        date: "2026-02-28",
        totalAssetCny: 110,
        dataJson: { allocation: [{ name: "股票", actualValue: 65, actualPct: 59.1 }], rates: {} },
      },
      {
        id: 3,
        date: "2026-03-03",
        totalAssetCny: 120,
        dataJson: { allocation: [{ name: "股票", actualValue: 70, actualPct: 58.3 }], rates: {} },
      },
    ],
    "month"
  );

  assert.deepEqual(points, [
    {
      date: "2026-02-28",
      totalAssetCny: 110,
      allocation: [{ name: "股票", actualValue: 65, actualPct: 59.1 }],
    },
    {
      date: "2026-03-03",
      totalAssetCny: 120,
      allocation: [{ name: "股票", actualValue: 70, actualPct: 58.3 }],
    },
  ]);
});
