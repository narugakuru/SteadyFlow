"use client";

import type { CacheMutationName, CacheQueryName } from "./policy.ts";
import { roundForStorage } from "../utils/format.ts";
import type { Account, Holding, Transaction } from "../utils/types.ts";

export interface MutationJsonVariables<TBody = unknown> {
  path: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  body?: TBody;
  mutationName: CacheMutationName;
  optimistic?: OptimisticMutationConfig;
}

export interface OptimisticUpdateContext<TBody = unknown> {
  queryName: CacheQueryName;
  queryKey: readonly unknown[];
  previous: unknown;
  variables: MutationJsonVariables<TBody>;
  tempId: number;
  readQueryData: <TData>(queryName: CacheQueryName) => TData | undefined;
}

export interface OptimisticMutationConfig<TBody = unknown> {
  queries?: CacheQueryName[];
  update: (context: OptimisticUpdateContext<TBody>) => unknown;
}

export interface OptimisticSnapshot {
  queryKey: readonly unknown[];
  data: unknown;
}

export function restoreOptimisticSnapshots(
  snapshots: OptimisticSnapshot[],
  setQueryData: (queryKey: readonly unknown[], data: unknown) => void
) {
  for (const snapshot of snapshots) {
    setQueryData(snapshot.queryKey, snapshot.data);
  }
}

type EntityMutationVariables = MutationJsonVariables<Record<string, unknown> | undefined>;

const ENTITY_QUERY_TARGETS: CacheQueryName[] = ["accounts", "holdings", "transactions"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = true): boolean {
  return value === undefined ? fallback : Boolean(value);
}

function nowIso() {
  return new Date().toISOString();
}

function parseResourceId(path: string, resource: "accounts" | "holdings" | "transactions") {
  const match = path.match(new RegExp(`/api/${resource}/(-?\\d+)`));
  return match ? Number(match[1]) : null;
}

function getSerializedParams(queryKey: readonly unknown[]) {
  return typeof queryKey[4] === "string" ? queryKey[4] : "default";
}

function getQueryParams(queryKey: readonly unknown[]) {
  const serialized = getSerializedParams(queryKey);
  const params = new URLSearchParams(serialized === "default" ? "" : serialized);
  return params;
}

function holdingCostBasis(holding: Holding) {
  return holding.valuationMode === "shares"
    ? roundForStorage(holding.cost * holding.shares, "amount")
    : holding.cost;
}

function holdingPnl(holding: Holding) {
  return roundForStorage(holding.marketValue - holdingCostBasis(holding), "amount");
}

function patchAccount(accounts: Account[], accountId: number, delta: Partial<Account>) {
  return accounts.map((account) => {
    if (account.id !== accountId) return account;
    const cashBalance = delta.cashBalance ?? account.cashBalance;
    const holdingsValue = delta.holdingsValue ?? account.holdingsValue;
    return {
      ...account,
      ...delta,
      cashBalance,
      holdingsValue,
      accountValue: roundForStorage(cashBalance + holdingsValue, "amount"),
      updatedAt: nowIso(),
    };
  });
}

function adjustAccount(
  accounts: Account[],
  accountId: number,
  delta: {
    cashBalance?: number;
    principal?: number;
    realizedPnl?: number;
    holdingsValue?: number;
    holdingsPnl?: number;
    holdingsCount?: number;
  }
) {
  return accounts.map((account) => {
    if (account.id !== accountId) return account;
    const cashBalance = roundForStorage(account.cashBalance + (delta.cashBalance ?? 0), "amount");
    const principal = roundForStorage(account.principal + (delta.principal ?? 0), "amount");
    const realizedPnl = roundForStorage(account.realizedPnl + (delta.realizedPnl ?? 0), "amount");
    const holdingsValue = roundForStorage(
      account.holdingsValue + (delta.holdingsValue ?? 0),
      "amount"
    );
    return {
      ...account,
      cashBalance,
      principal,
      realizedPnl,
      holdingsValue,
      holdingsPnl: roundForStorage(account.holdingsPnl + (delta.holdingsPnl ?? 0), "amount"),
      holdingsCount: Math.max(0, account.holdingsCount + (delta.holdingsCount ?? 0)),
      accountValue: roundForStorage(cashBalance + holdingsValue, "amount"),
      updatedAt: nowIso(),
    };
  });
}

function applyAccountMutation(
  previous: unknown,
  variables: EntityMutationVariables,
  tempId: number
) {
  if (!Array.isArray(previous)) return previous;
  const accounts = previous as Account[];
  const body = asRecord(variables.body);

  if (variables.path === "/api/accounts/reorder") {
    const accountIds = Array.isArray(body.accountIds) ? body.accountIds.map(Number) : [];
    if (!accountIds.length) return previous;
    const order = new Map(accountIds.map((id, index) => [id, index + 1]));
    return accounts.map((account) => ({
      ...account,
      sortOrder: order.get(account.id) ?? account.sortOrder,
      updatedAt: order.has(account.id) ? nowIso() : account.updatedAt,
    }));
  }

  if (variables.method === "POST" && variables.path === "/api/accounts") {
    const cashBalance = asNumber(body.cashBalance);
    const principal = body.principal == null ? cashBalance : asNumber(body.principal);
    const sortOrder = accounts.reduce((max, account) => Math.max(max, account.sortOrder), 0) + 1;
    const account: Account = {
      id: tempId,
      name: String(body.name ?? "新账户"),
      currency: String(body.currency ?? "CNY") as Account["currency"],
      cashBalance,
      principal,
      realizedPnl: 0,
      holdingsPnl: 0,
      sortOrder,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      holdingsValue: 0,
      holdingsCount: 0,
      accountValue: cashBalance,
    };
    return [...accounts, account];
  }

  const accountId = parseResourceId(variables.path, "accounts");
  if (accountId == null) return previous;

  if (variables.method === "DELETE") {
    return accounts.filter((account) => account.id !== accountId);
  }

  if (variables.method === "PUT" || variables.method === "PATCH") {
    return patchAccount(accounts, accountId, {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.currency !== undefined && {
        currency: String(body.currency) as Account["currency"],
      }),
      ...(body.cashBalance !== undefined && { cashBalance: asNumber(body.cashBalance) }),
      ...(body.principal !== undefined && { principal: asNumber(body.principal) }),
    });
  }

  return previous;
}

function buildOptimisticHolding(
  previous: Holding[],
  variables: EntityMutationVariables,
  tempId: number
) {
  const body = asRecord(variables.body);
  const accountId = asNumber(body.accountId);
  const valuationMode = body.valuationMode === "shares" ? "shares" : "amount";
  const accountSortOrder =
    previous
      .filter((holding) => holding.accountId === accountId)
      .reduce((max, holding) => Math.max(max, holding.accountSortOrder), 0) + 1;
  const disciplineSortOrder =
    previous
      .filter((holding) => holding.assetClass === body.assetClass)
      .reduce((max, holding) => Math.max(max, holding.disciplineSortOrder), 0) + 1;
  const shares = roundForStorage(asNumber(body.shares), "shares");
  const price = roundForStorage(asNumber(body.price), "price");
  const cost = roundForStorage(asNumber(body.cost), "amount");
  const marketValue =
    valuationMode === "shares"
      ? roundForStorage(shares * price, "amount")
      : roundForStorage(body.marketValue == null ? cost : asNumber(body.marketValue), "amount");

  return {
    id: tempId,
    accountId,
    name: String(body.name ?? "新持仓"),
    ticker: typeof body.ticker === "string" && body.ticker ? body.ticker : null,
    valuationMode,
    cost,
    marketValue,
    shares,
    price,
    assetClass: String(body.assetClass ?? ""),
    accountSortOrder,
    disciplineSortOrder,
    memo: typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } satisfies Holding;
}

function patchHolding(holding: Holding, body: Record<string, unknown>) {
  const valuationMode =
    body.valuationMode === "amount" || body.valuationMode === "shares"
      ? body.valuationMode
      : holding.valuationMode;
  const shares =
    body.shares !== undefined ? roundForStorage(asNumber(body.shares), "shares") : holding.shares;
  const price =
    body.price !== undefined ? roundForStorage(asNumber(body.price), "price") : holding.price;
  const cost =
    body.cost !== undefined
      ? roundForStorage(asNumber(body.cost), valuationMode === "shares" ? "price" : "amount")
      : holding.cost;
  const marketValue =
    valuationMode === "shares"
      ? roundForStorage(shares * price, "amount")
      : body.marketValue !== undefined
        ? roundForStorage(asNumber(body.marketValue), "amount")
        : holding.marketValue;

  return {
    ...holding,
    ...(body.name !== undefined && { name: String(body.name) }),
    ...(body.ticker !== undefined && {
      ticker: typeof body.ticker === "string" && body.ticker ? body.ticker : null,
    }),
    ...(body.memo !== undefined && {
      memo: typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null,
    }),
    ...(body.assetClass !== undefined && { assetClass: String(body.assetClass) }),
    ...(body.accountSortOrder !== undefined && {
      accountSortOrder: Math.floor(asNumber(body.accountSortOrder)),
    }),
    ...(body.disciplineSortOrder !== undefined && {
      disciplineSortOrder: Math.floor(asNumber(body.disciplineSortOrder)),
    }),
    valuationMode,
    shares,
    price,
    cost,
    marketValue,
    updatedAt: nowIso(),
  } satisfies Holding;
}

function holdingVisibleForQuery(holding: Holding, queryKey: readonly unknown[]) {
  const params = getQueryParams(queryKey);
  return params.get("includeZeroMarketValue") !== "0" || holding.marketValue > 0;
}

function applyHoldingMutation(
  previous: unknown,
  variables: EntityMutationVariables,
  tempId: number,
  queryKey: readonly unknown[]
) {
  if (!Array.isArray(previous)) return previous;
  const holdings = previous as Holding[];

  if (variables.path === "/api/holdings/reorder") {
    const body = asRecord(variables.body);
    const holdingIds = Array.isArray(body.holdingIds) ? body.holdingIds.map(Number) : [];
    const order = new Map(holdingIds.map((id, index) => [id, index + 1]));
    return holdings.map((holding) => {
      if (!order.has(holding.id)) return holding;
      return {
        ...holding,
        ...(body.scope === "discipline" || (!body.accountId && body.assetClass)
          ? { disciplineSortOrder: order.get(holding.id) ?? holding.disciplineSortOrder }
          : { accountSortOrder: order.get(holding.id) ?? holding.accountSortOrder }),
        updatedAt: nowIso(),
      };
    });
  }

  if (variables.method === "POST" && variables.path === "/api/holdings") {
    const holding = buildOptimisticHolding(holdings, variables, tempId);
    return holdingVisibleForQuery(holding, queryKey) ? [...holdings, holding] : holdings;
  }

  const holdingId = parseResourceId(variables.path, "holdings");
  if (holdingId == null) return previous;

  if (variables.method === "DELETE") {
    return holdings.filter((holding) => holding.id !== holdingId);
  }

  if (variables.method === "PUT" || variables.method === "PATCH") {
    const body = asRecord(variables.body);
    return holdings.flatMap((holding) => {
      if (holding.id !== holdingId) return [holding];
      const patched = patchHolding(holding, body);
      return holdingVisibleForQuery(patched, queryKey) ? [patched] : [];
    });
  }

  return previous;
}

function calculateTransactionPlan(
  body: Record<string, unknown>,
  accounts: Account[],
  holdings: Holding[]
) {
  const accountId = asNumber(body.accountId);
  const holdingId = body.holdingId == null ? null : asNumber(body.holdingId);
  const type = String(body.type) as Transaction["type"];
  const account = accounts.find((item) => item.id === accountId);
  const holding =
    holdingId == null ? null : (holdings.find((item) => item.id === holdingId) ?? null);
  let affectCash = asBoolean(body.affectCash, true);
  let affectHolding = asBoolean(body.affectHolding, true);
  if (type === "fee") {
    affectCash = true;
    affectHolding = false;
  } else if (type !== "buy" && type !== "sell") {
    affectHolding = false;
  }

  const shares = body.shares == null ? null : roundForStorage(asNumber(body.shares), "shares");
  const price = body.price == null ? null : roundForStorage(asNumber(body.price), "price");
  const baseAmount = roundForStorage(asNumber(body.amount), "amount");
  const amount =
    holding?.valuationMode === "shares" &&
    (type === "buy" || type === "sell") &&
    shares != null &&
    price != null
      ? roundForStorage(shares * price, "amount")
      : baseAmount;
  const fee = type === "fee" ? 0 : roundForStorage(asNumber(body.fee), "amount");

  let cashDelta = 0;
  let principalDelta = 0;
  let realizedPnl = 0;
  let holdingSharesDelta = 0;
  let holdingCostDelta = 0;
  let holdingMarketValueDelta = 0;
  let nextHolding = holding;

  if (type === "buy") {
    realizedPnl = fee > 0 ? roundForStorage(-fee, "amount") : 0;
    if (affectCash) cashDelta = roundForStorage(-amount - fee, "amount");
    if (affectHolding && holding) {
      if (holding.valuationMode === "shares" && shares != null) {
        const nextShares = roundForStorage(holding.shares + shares, "shares");
        const nextPrice = price ?? holding.price;
        holdingSharesDelta = shares;
        holdingCostDelta = roundForStorage(nextPrice * shares, "amount");
        const nextCost =
          nextShares > 0
            ? roundForStorage(
                (holding.cost * holding.shares + holdingCostDelta) / nextShares,
                "price"
              )
            : nextPrice;
        const nextMarketValue = roundForStorage(nextShares * nextPrice, "amount");
        holdingMarketValueDelta = roundForStorage(nextMarketValue - holding.marketValue, "amount");
        nextHolding = {
          ...holding,
          shares: nextShares,
          price: nextPrice,
          cost: nextCost,
          marketValue: nextMarketValue,
        };
      } else {
        holdingCostDelta = amount;
        holdingMarketValueDelta = amount;
        nextHolding = {
          ...holding,
          cost: roundForStorage(holding.cost + amount, "amount"),
          marketValue: roundForStorage(holding.marketValue + amount, "amount"),
        };
      }
    }
  }

  if (type === "sell") {
    if (affectCash) cashDelta = roundForStorage(amount - fee, "amount");
    if (affectHolding && holding) {
      if (holding.valuationMode === "shares" && shares != null) {
        const costReduce = roundForStorage(holding.cost * shares, "amount");
        const nextShares = roundForStorage(holding.shares - shares, "shares");
        const nextPrice = price ?? holding.price;
        const nextMarketValue = roundForStorage(nextShares * nextPrice, "amount");
        holdingSharesDelta = roundForStorage(-shares, "shares");
        holdingCostDelta = roundForStorage(-costReduce, "amount");
        holdingMarketValueDelta = roundForStorage(nextMarketValue - holding.marketValue, "amount");
        realizedPnl = roundForStorage(amount - costReduce - fee, "amount");
        nextHolding = {
          ...holding,
          shares: nextShares,
          price: nextPrice,
          marketValue: nextMarketValue,
        };
      } else if (holding.marketValue > 0) {
        const costReduce = roundForStorage((amount * holding.cost) / holding.marketValue, "amount");
        holdingCostDelta = roundForStorage(-costReduce, "amount");
        holdingMarketValueDelta = roundForStorage(-amount, "amount");
        realizedPnl = roundForStorage(amount - costReduce - fee, "amount");
        nextHolding = {
          ...holding,
          cost: roundForStorage(holding.cost - costReduce, "amount"),
          marketValue: roundForStorage(holding.marketValue - amount, "amount"),
        };
      }
    }
  }

  if (type === "dividend" && affectCash) {
    cashDelta = roundForStorage(amount - fee, "amount");
    realizedPnl = roundForStorage(amount - fee, "amount");
  }
  if (type === "deposit" && affectCash) {
    cashDelta = amount;
    principalDelta = amount;
  }
  if (type === "withdraw" && affectCash) {
    cashDelta = roundForStorage(-amount, "amount");
    principalDelta = roundForStorage(-amount, "amount");
  }
  if (type === "fee") {
    cashDelta = roundForStorage(-amount, "amount");
    realizedPnl = roundForStorage(-amount, "amount");
  }

  const holdingPnlDelta =
    holding && nextHolding
      ? roundForStorage(holdingPnl(nextHolding) - holdingPnl(holding), "amount")
      : 0;

  return {
    account,
    holding,
    nextHolding,
    transaction: {
      accountId,
      holdingId,
      type,
      date: String(body.date ?? new Date().toISOString().split("T")[0]),
      amount,
      realizedPnl,
      cashDelta,
      principalDelta,
      holdingSharesDelta,
      holdingCostDelta,
      holdingMarketValueDelta,
      shares,
      price,
      fee,
      affectCash,
      affectHolding,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      accountName: account?.name,
      accountCurrency: account?.currency,
      holdingName: holding?.name,
    },
    accountDelta: {
      cashBalance: cashDelta,
      principal: principalDelta,
      realizedPnl,
      holdingsValue: holdingMarketValueDelta,
      holdingsPnl: holdingPnlDelta,
    },
  };
}

function transactionMatchesQuery(transaction: Transaction, queryKey: readonly unknown[]) {
  const params = getQueryParams(queryKey);
  const accountId = params.get("accountId");
  const type = params.get("type");
  return (
    (!accountId || transaction.accountId === Number(accountId)) &&
    (!type || transaction.type === type)
  );
}

function applyTransactionMutation(
  previous: unknown,
  variables: EntityMutationVariables,
  tempId: number,
  queryKey: readonly unknown[],
  accounts: Account[],
  holdings: Holding[]
) {
  if (!Array.isArray(previous)) return previous;
  const transactions = previous as Transaction[];

  if (variables.method === "POST" && variables.path === "/api/transactions") {
    const plan = calculateTransactionPlan(asRecord(variables.body), accounts, holdings);
    const optimisticTransaction: Transaction = {
      id: tempId,
      createdAt: nowIso(),
      ...plan.transaction,
    };
    if (!transactionMatchesQuery(optimisticTransaction, queryKey)) return transactions;
    return [optimisticTransaction, ...transactions];
  }

  const transactionId = parseResourceId(variables.path, "transactions");
  if (variables.method === "DELETE" && transactionId != null) {
    return transactions.filter((transaction) => transaction.id !== transactionId);
  }

  return previous;
}

function applyTransactionSideEffects(
  previous: unknown,
  variables: EntityMutationVariables,
  queryName: CacheQueryName,
  accounts: Account[],
  holdings: Holding[]
) {
  if (!Array.isArray(previous)) return previous;

  if (variables.method === "POST" && variables.path === "/api/transactions") {
    const plan = calculateTransactionPlan(asRecord(variables.body), accounts, holdings);
    if (queryName === "accounts") {
      return adjustAccount(previous as Account[], plan.transaction.accountId, plan.accountDelta);
    }
    if (queryName === "holdings" && plan.holding && plan.nextHolding) {
      return (previous as Holding[]).map((holding) =>
        holding.id === plan.holding?.id ? { ...plan.nextHolding!, updatedAt: nowIso() } : holding
      );
    }
  }

  return previous;
}

function applyTransactionDeleteSideEffects(
  previous: unknown,
  transactionId: number,
  queryName: CacheQueryName,
  transactions: Transaction[],
  holdings: Holding[]
) {
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction || !Array.isArray(previous)) return previous;

  if (queryName === "accounts") {
    const holding = transaction.holdingId
      ? holdings.find((item) => item.id === transaction.holdingId)
      : null;
    const restoredHolding = holding ? rollbackHoldingByTransaction(holding, transaction) : null;
    const holdingsValueDelta =
      holding && restoredHolding
        ? roundForStorage(restoredHolding.marketValue - holding.marketValue, "amount")
        : -transaction.holdingMarketValueDelta;
    const holdingsPnlDelta =
      holding && restoredHolding
        ? roundForStorage(holdingPnl(restoredHolding) - holdingPnl(holding), "amount")
        : 0;
    return adjustAccount(previous as Account[], transaction.accountId, {
      cashBalance: -transaction.cashDelta,
      principal: -transaction.principalDelta,
      realizedPnl: -transaction.realizedPnl,
      holdingsValue: holdingsValueDelta,
      holdingsPnl: holdingsPnlDelta,
    });
  }

  if (queryName === "holdings" && transaction.holdingId) {
    return (previous as Holding[]).map((holding) => {
      if (holding.id !== transaction.holdingId) return holding;
      return rollbackHoldingByTransaction(holding, transaction);
    });
  }

  return previous;
}

function rollbackHoldingByTransaction(holding: Holding, transaction: Transaction) {
  if (holding.valuationMode === "shares") {
    const currentCostBasis = holdingCostBasis(holding);
    const nextShares = roundForStorage(holding.shares - transaction.holdingSharesDelta, "shares");
    const nextCostBasis = roundForStorage(
      currentCostBasis - transaction.holdingCostDelta,
      "amount"
    );
    const nextCost = nextShares > 0 ? roundForStorage(nextCostBasis / nextShares, "price") : 0;
    return {
      ...holding,
      shares: nextShares,
      cost: nextCost,
      marketValue: roundForStorage(nextShares * holding.price, "amount"),
      updatedAt: nowIso(),
    };
  }

  return {
    ...holding,
    cost: roundForStorage(holding.cost - transaction.holdingCostDelta, "amount"),
    marketValue: roundForStorage(
      holding.marketValue - transaction.holdingMarketValueDelta,
      "amount"
    ),
    updatedAt: nowIso(),
  };
}

export const entityOptimisticUpdate: OptimisticMutationConfig = {
  queries: ENTITY_QUERY_TARGETS,
  update: (context) => {
    const variables = context.variables as EntityMutationVariables;

    if (variables.mutationName === "accounts-write") {
      if (context.queryName === "accounts") {
        return applyAccountMutation(context.previous, variables, context.tempId);
      }
      const accountId = parseResourceId(variables.path, "accounts");
      if (variables.method === "DELETE" && accountId != null) {
        if (context.queryName === "holdings") {
          return Array.isArray(context.previous)
            ? (context.previous as Holding[]).filter((holding) => holding.accountId !== accountId)
            : context.previous;
        }
        if (context.queryName === "transactions") {
          return Array.isArray(context.previous)
            ? (context.previous as Transaction[]).filter((tx) => tx.accountId !== accountId)
            : context.previous;
        }
      }
    }

    if (variables.mutationName === "holdings-write") {
      if (context.queryName === "holdings") {
        return applyHoldingMutation(context.previous, variables, context.tempId, context.queryKey);
      }
      if (context.queryName === "accounts") {
        const currentHoldings = context.readQueryData<Holding[]>("holdings") ?? [];
        const before = currentHoldings;
        const after = applyHoldingMutation(
          before,
          variables,
          context.tempId,
          context.queryKey
        ) as Holding[];
        if (!Array.isArray(after)) return context.previous;
        const changedAccountIds = new Set<number>();
        for (const holding of before) changedAccountIds.add(holding.accountId);
        for (const holding of after) changedAccountIds.add(holding.accountId);
        return Array.from(changedAccountIds).reduce((nextAccounts, accountId) => {
          const beforeAccountHoldings = before.filter((holding) => holding.accountId === accountId);
          const afterAccountHoldings = after.filter((holding) => holding.accountId === accountId);
          const beforeValue = beforeAccountHoldings.reduce(
            (sum, holding) => sum + holding.marketValue,
            0
          );
          const afterValue = afterAccountHoldings.reduce(
            (sum, holding) => sum + holding.marketValue,
            0
          );
          const beforePnl = beforeAccountHoldings.reduce(
            (sum, holding) => sum + holdingPnl(holding),
            0
          );
          const afterPnl = afterAccountHoldings.reduce(
            (sum, holding) => sum + holdingPnl(holding),
            0
          );
          return adjustAccount(nextAccounts, accountId, {
            holdingsValue: roundForStorage(afterValue - beforeValue, "amount"),
            holdingsPnl: roundForStorage(afterPnl - beforePnl, "amount"),
            holdingsCount: afterAccountHoldings.length - beforeAccountHoldings.length,
          });
        }, context.previous as Account[]);
      }
    }

    if (variables.mutationName === "transactions-write") {
      const accounts = context.readQueryData<Account[]>("accounts") ?? [];
      const holdings = context.readQueryData<Holding[]>("holdings") ?? [];
      const transactions = context.readQueryData<Transaction[]>("transactions") ?? [];
      const transactionId = parseResourceId(variables.path, "transactions");
      if (variables.method === "DELETE" && transactionId != null) {
        if (context.queryName === "transactions") {
          return applyTransactionMutation(
            context.previous,
            variables,
            context.tempId,
            context.queryKey,
            accounts,
            holdings
          );
        }
        return applyTransactionDeleteSideEffects(
          context.previous,
          transactionId,
          context.queryName,
          transactions,
          holdings
        );
      }
      if (context.queryName === "transactions") {
        return applyTransactionMutation(
          context.previous,
          variables,
          context.tempId,
          context.queryKey,
          accounts,
          holdings
        );
      }
      return applyTransactionSideEffects(
        context.previous,
        variables,
        context.queryName,
        accounts,
        holdings
      );
    }

    return context.previous;
  },
};
