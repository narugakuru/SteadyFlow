import test from "node:test";
import assert from "node:assert/strict";
import {
  filterVisibleDisciplineHoldings,
  getEffectiveDisciplineMarketValue,
  isZeroDisciplineHoldingValue,
  sortDisciplineHoldingsWithZeroLast,
} from "../../src/lib/services/discipline-holdings.ts";

test("sortDisciplineHoldingsWithZeroLast keeps non-zero holdings first by discipline sort", () => {
  const result = sortDisciplineHoldingsWithZeroLast([
    { id: 3, marketValueCny: 0, disciplineSortOrder: 1 },
    { id: 2, marketValueCny: 100, disciplineSortOrder: 2 },
    { id: 1, marketValueCny: 50, disciplineSortOrder: 1 },
    { id: 4, marketValueCny: 0, disciplineSortOrder: 3 },
  ]);

  assert.deepEqual(
    result.map((item) => item.id),
    [1, 2, 3, 4]
  );
});

test("filterVisibleDisciplineHoldings removes zero-amount holdings", () => {
  const result = filterVisibleDisciplineHoldings([
    { id: 1, marketValueCny: 1200.5 },
    { id: 2, marketValueCny: 0 },
    { id: 3, marketValueCny: 0.01 },
  ]);

  assert.deepEqual(
    result.map((item) => item.id),
    [1, 3]
  );
});

test("getEffectiveDisciplineMarketValue prefers shares x price for shares mode", () => {
  assert.equal(
    getEffectiveDisciplineMarketValue({
      valuationMode: "shares",
      marketValue: 999,
      shares: 12,
      price: 0,
    }),
    0
  );

  assert.equal(
    getEffectiveDisciplineMarketValue({
      valuationMode: "amount",
      marketValue: 88,
      shares: 12,
      price: 0,
    }),
    88
  );
});

test("isZeroDisciplineHoldingValue recognizes both valuation modes", () => {
  assert.equal(
    isZeroDisciplineHoldingValue({
      valuationMode: "shares",
      marketValue: 500,
      shares: 0,
      price: 8,
    }),
    true
  );

  assert.equal(
    isZeroDisciplineHoldingValue({
      valuationMode: "amount",
      marketValue: 0,
    }),
    true
  );

  assert.equal(
    isZeroDisciplineHoldingValue({
      valuationMode: "shares",
      marketValue: 0,
      shares: 10,
      price: 3.2,
    }),
    false
  );
});
