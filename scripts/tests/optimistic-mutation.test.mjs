import test from "node:test";
import assert from "node:assert/strict";

import { MUTATION_INVALIDATES } from "../../src/lib/cache/policy.ts";
import {
  entityOptimisticUpdate,
  restoreOptimisticSnapshots,
} from "../../src/lib/cache/optimistic.ts";

const queryKey = (name, params = "default") => ["im", "v1", "user-1", name, params];

const baseAccount = {
  id: 1,
  name: "Broker",
  currency: "CNY",
  cashBalance: 1000,
  principal: 1000,
  realizedPnl: 0,
  holdingsPnl: 20,
  sortOrder: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  holdingsValue: 120,
  holdingsCount: 1,
  accountValue: 1120,
};

const baseHolding = {
  id: 10,
  accountId: 1,
  name: "ETF",
  ticker: "ETF",
  valuationMode: "shares",
  cost: 10,
  marketValue: 120,
  shares: 10,
  price: 12,
  assetClass: "股票",
  accountSortOrder: 1,
  disciplineSortOrder: 1,
  memo: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function runEntityUpdate({ queryName, previous, variables, tempId = -100, cache = {} }) {
  return entityOptimisticUpdate.update({
    queryName,
    queryKey: queryKey(queryName),
    previous,
    variables,
    tempId,
    readQueryData: (name) => cache[name],
  });
}

test("optimistic transaction create inserts a temporary row before the request settles", () => {
  const variables = {
    path: "/api/transactions",
    method: "POST",
    mutationName: "transactions-write",
    body: {
      accountId: 1,
      holdingId: 10,
      type: "buy",
      date: "2026-06-10",
      shares: 2,
      price: 15,
      affectCash: true,
      affectHolding: true,
      fee: 1,
    },
  };

  const result = runEntityUpdate({
    queryName: "transactions",
    previous: [],
    variables,
    tempId: -42,
    cache: { accounts: [baseAccount], holdings: [baseHolding], transactions: [] },
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, -42);
  assert.equal(result[0].amount, 30);
  assert.equal(result[0].cashDelta, -31);
  assert.equal(result[0].accountName, "Broker");
  assert.equal(result[0].holdingName, "ETF");
});

test("optimistic holding edit updates account aggregates immediately", () => {
  const variables = {
    path: "/api/holdings/10",
    method: "PUT",
    mutationName: "holdings-write",
    body: { shares: 10, price: 14, cost: 10 },
  };

  const result = runEntityUpdate({
    queryName: "accounts",
    previous: [baseAccount],
    variables,
    cache: { holdings: [baseHolding] },
  });

  assert.equal(result[0].holdingsValue, 140);
  assert.equal(result[0].holdingsPnl, 40);
  assert.equal(result[0].accountValue, 1140);
});

test("failed optimistic mutation restores every cached query snapshot", () => {
  const restored = new Map();
  const snapshots = [
    { queryKey: queryKey("accounts"), data: [baseAccount] },
    { queryKey: queryKey("holdings"), data: [baseHolding] },
  ];

  restoreOptimisticSnapshots(snapshots, (key, data) => {
    restored.set(key.join("|"), data);
  });

  assert.deepEqual(restored.get(queryKey("accounts").join("|")), [baseAccount]);
  assert.deepEqual(restored.get(queryKey("holdings").join("|")), [baseHolding]);
});

test("optimistic transaction delete reverses account and holding aggregate deltas", () => {
  const updatedAccount = {
    ...baseAccount,
    cashBalance: 969,
    holdingsValue: 180,
    holdingsPnl: 50,
    realizedPnl: -1,
    accountValue: 1149,
  };
  const updatedHolding = {
    ...baseHolding,
    shares: 12,
    cost: 10.8333,
    price: 15,
    marketValue: 180,
  };
  const transaction = {
    id: 77,
    accountId: 1,
    holdingId: 10,
    type: "buy",
    date: "2026-06-10",
    amount: 30,
    realizedPnl: -1,
    cashDelta: -31,
    principalDelta: 0,
    holdingSharesDelta: 2,
    holdingCostDelta: 30,
    holdingMarketValueDelta: 60,
    shares: 2,
    price: 15,
    fee: 1,
    affectCash: true,
    affectHolding: true,
    note: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    accountName: "Broker",
    accountCurrency: "CNY",
    holdingName: "ETF",
  };

  const result = runEntityUpdate({
    queryName: "accounts",
    previous: [updatedAccount],
    variables: {
      path: "/api/transactions/77",
      method: "DELETE",
      mutationName: "transactions-write",
    },
    cache: { transactions: [transaction], holdings: [updatedHolding] },
  });

  assert.equal(result[0].cashBalance, 1000);
  assert.equal(result[0].holdingsValue, 150);
  assert.equal(result[0].holdingsPnl, 49.9996);
  assert.equal(result[0].realizedPnl, 0);
  assert.equal(result[0].accountValue, 1150);
});

test("settled optimistic mutations invalidate affected queries for server calibration", () => {
  assert.deepEqual(
    ["transactions", "holdings", "accounts"].every((queryName) =>
      MUTATION_INVALIDATES["transactions-write"].includes(queryName)
    ),
    true
  );
  assert.ok(MUTATION_INVALIDATES["holdings-write"].includes("holdings"));
  assert.ok(MUTATION_INVALIDATES["accounts-write"].includes("accounts"));
});

test("optimistic creates use temporary ids and rely on invalidation to replace them", () => {
  const variables = {
    path: "/api/holdings",
    method: "POST",
    mutationName: "holdings-write",
    body: {
      accountId: 1,
      name: "Temp ETF",
      ticker: "TMP",
      valuationMode: "amount",
      assetClass: "股票",
      marketValue: 100,
      cost: 100,
    },
  };

  const result = runEntityUpdate({
    queryName: "holdings",
    previous: [baseHolding],
    variables,
    tempId: -99,
  });

  assert.equal(result.at(-1).id, -99);
  assert.ok(MUTATION_INVALIDATES["holdings-write"].includes("holdings"));
});
