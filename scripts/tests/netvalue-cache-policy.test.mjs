import test from "node:test";
import assert from "node:assert/strict";

import {
  MUTATION_INVALIDATES,
  QUERY_POLICIES,
} from "../../src/lib/cache/policy.ts";

test("netvalue list and chart queries use 60 minute stale policies", () => {
  assert.equal(QUERY_POLICIES["netvalue-list"].staleTimeMs, 60 * 60 * 1000);
  assert.equal(QUERY_POLICIES["netvalue-chart"].staleTimeMs, 60 * 60 * 1000);
  assert.equal(QUERY_POLICIES["netvalue-list"].persistTimeMs, 3 * 24 * 60 * 60 * 1000);
  assert.equal(QUERY_POLICIES["netvalue-chart"].persistTimeMs, 3 * 24 * 60 * 60 * 1000);
});

test("netvalue-affecting mutations invalidate both list and chart caches", () => {
  const mutationNames = [
    "accounts-write",
    "holdings-write",
    "transactions-write",
    "batch-update-write",
    "fetch-prices-write",
  ];

  for (const mutationName of mutationNames) {
    assert.ok(MUTATION_INVALIDATES[mutationName].includes("netvalue-list"));
    assert.ok(MUTATION_INVALIDATES[mutationName].includes("netvalue-chart"));
  }
});
