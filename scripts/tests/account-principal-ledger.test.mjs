import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCumulativePnl,
  calculateCumulativePnlPct,
  calculateFeeRealizedPnl,
  reverseLedgerDelta,
} from "../../src/lib/utils/account-principal.ts";

test("cumulative PnL uses account value minus principal", () => {
  assert.equal(calculateCumulativePnl(120000, 100000), 20000);
  assert.equal(calculateCumulativePnl(30000, -20000), 50000);
});

test("cumulative PnL percentage is hidden when principal is not positive", () => {
  assert.equal(calculateCumulativePnlPct(20000, 100000), 20);
  assert.equal(calculateCumulativePnlPct(30000, 0), null);
  assert.equal(calculateCumulativePnlPct(50000, -20000), null);
});

test("fee amount is recorded as negative realized PnL", () => {
  assert.equal(calculateFeeRealizedPnl(100), -100);
  assert.equal(calculateFeeRealizedPnl(12.34567), -12.3457);
});

test("ledger deletion rollback applies the reverse delta", () => {
  assert.equal(reverseLedgerDelta(110000, 10000), 100000);
  assert.equal(reverseLedgerDelta(900, -100), 1000);
});
