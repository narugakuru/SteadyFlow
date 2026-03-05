import test from "node:test";
import assert from "node:assert/strict";
import {
  reorderHoldingSortItemsById,
  rollbackHoldingSortItems,
} from "../../src/lib/services/holding-sort-state.ts";

test("reorderHoldingSortItemsById reorders when drag target is valid", () => {
  const source = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const result = reorderHoldingSortItemsById(source, 1, 3);

  assert.deepEqual(
    result.map((item) => item.id),
    [2, 3, 1]
  );
});

test("reorderHoldingSortItemsById keeps original reference for invalid drag ids", () => {
  const source = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const result = reorderHoldingSortItemsById(source, 99, 3);

  assert.equal(result, source);
});

test("rollbackHoldingSortItems returns a copy of confirmed order", () => {
  const confirmed = [{ id: 3 }, { id: 1 }];
  const rolledBack = rollbackHoldingSortItems(confirmed);

  assert.notEqual(rolledBack, confirmed);
  assert.deepEqual(rolledBack, confirmed);
});

