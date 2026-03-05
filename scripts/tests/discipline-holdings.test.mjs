import test from "node:test";
import assert from "node:assert/strict";
import {
  filterVisibleDisciplineHoldings,
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

