import test from "node:test";
import assert from "node:assert/strict";
import { getQuoteRefreshScopeSkipReason } from "../../src/lib/services/quote-refresh-scope.ts";

test("getQuoteRefreshScopeSkipReason skips non-shares holdings", () => {
  assert.equal(
    getQuoteRefreshScopeSkipReason({
      valuationMode: "amount",
      shares: 100,
    }),
    "amount 模式"
  );
});

test("getQuoteRefreshScopeSkipReason skips sold-out shares holdings", () => {
  assert.equal(
    getQuoteRefreshScopeSkipReason({
      valuationMode: "shares",
      shares: 0,
    }),
    "未持有"
  );

  assert.equal(
    getQuoteRefreshScopeSkipReason({
      valuationMode: "shares",
      shares: -10,
    }),
    "未持有"
  );
});

test("getQuoteRefreshScopeSkipReason allows positive shares even when old value is zero", () => {
  assert.equal(
    getQuoteRefreshScopeSkipReason({
      valuationMode: "shares",
      shares: 10,
    }),
    null
  );
});
