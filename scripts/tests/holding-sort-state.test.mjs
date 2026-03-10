import test from "node:test";
import assert from "node:assert/strict";
import {
  reorderHoldingSortItemsById,
  rollbackHoldingSortItems,
} from "../../src/lib/services/holding-sort-state.ts";
import {
  SORTABLE_DRAG_HANDLE_CLASS_NAME,
  SORTABLE_MOUSE_ACTIVATION_DISTANCE,
  SORTABLE_TOUCH_ACTIVATION_DELAY,
  SORTABLE_TOUCH_ACTIVATION_TOLERANCE,
  restrictToVerticalDrag,
} from "../../src/lib/services/mobile-sort-dnd.ts";

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

test("restrictToVerticalDrag removes horizontal movement and keeps vertical transform", () => {
  const transform = restrictToVerticalDrag({
    activatorEvent: null,
    active: null,
    activeNodeRect: null,
    draggingNodeRect: null,
    containerNodeRect: null,
    over: null,
    overlayNodeRect: null,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    transform: { x: 36, y: -84, scaleX: 1, scaleY: 1 },
    windowRect: null,
  });

  assert.deepEqual(transform, { x: 0, y: -84, scaleX: 1, scaleY: 1 });
});

test("mobile sort dnd config keeps touch-only drag handle semantics", () => {
  assert.equal(SORTABLE_MOUSE_ACTIVATION_DISTANCE, 4);
  assert.equal(SORTABLE_TOUCH_ACTIVATION_DELAY, 120);
  assert.equal(SORTABLE_TOUCH_ACTIVATION_TOLERANCE, 8);
  assert.match(SORTABLE_DRAG_HANDLE_CLASS_NAME, /\btouch-none\b/);
});
