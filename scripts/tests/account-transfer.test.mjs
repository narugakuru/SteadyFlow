import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  calculateAccountTransfer,
  reverseAccountTransferDelta,
} from "../../src/lib/utils/account-transfer.ts";

test("same-currency transfer forces matching destination amount", () => {
  assert.deepEqual(calculateAccountTransfer("CNY", "CNY", 10000, 999), {
    fromAmount: 10000,
    toAmount: 10000,
    fromDelta: -10000,
    toDelta: 10000,
  });
});

test("cross-currency transfer keeps actual amounts in each account currency", () => {
  assert.deepEqual(calculateAccountTransfer("CNY", "USD", 7200, 1000), {
    fromAmount: 7200,
    toAmount: 1000,
    fromDelta: -7200,
    toDelta: 1000,
  });
});

test("transfer rejects missing or non-positive amounts", () => {
  assert.throws(() => calculateAccountTransfer("CNY", "USD", 0, 1000), /转出金额/);
  assert.throws(() => calculateAccountTransfer("CNY", "USD", 7200, Number.NaN), /到账金额/);
});

test("group rollback reverses both account deltas", () => {
  assert.equal(reverseAccountTransferDelta(95000, -5000), 100000);
  assert.equal(reverseAccountTransferDelta(25000, 5000), 20000);
});

test("performance cash-flow query excludes account transfer types", () => {
  const source = fs.readFileSync("src/lib/services/performance-service.ts", "utf8");
  assert.match(source, /inArray\(transactions\.type, \["deposit", "withdraw"\]\)/);
  assert.doesNotMatch(source, /inArray\(transactions\.type,[\s\S]{0,100}transfer_(?:in|out)/);
});
