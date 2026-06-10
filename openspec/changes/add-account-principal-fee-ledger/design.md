## Context

Accounts currently store cash balance and cumulative realized PnL. Holdings store current position state, and transactions store the visible transaction record plus `realizedPnl`, `affectCash`, and `affectHolding`.

Profit reporting is currently split between:

- holding PnL: current holding value minus holding cost
- realized PnL: sell/dividend increments stored on transactions and accounts
- dashboard total PnL: realized plus unrealized PnL

This does not explicitly track net invested principal. Deposits, withdrawals, standalone fees, buy-side fees, and later transaction deletion all need a more deterministic ledger model.

The project supports both SQLite and PostgreSQL/Neon through Drizzle schemas and migrations. PostgreSQL production migration must be treated cautiously: migration SQL can be committed, but production should only be applied after the same migration has been verified against a development Neon database.

## Goals / Non-Goals

**Goals:**

- Store account principal in the account's native currency.
- Compute account cumulative PnL from account value and principal.
- Add a standalone `fee` transaction type that reduces cash and realized PnL.
- Count fee costs in realized PnL.
- Store transaction side-effect deltas so deletion can rollback cash, principal, realized PnL, and holding state.
- Keep existing holding PnL display and add cumulative PnL only to the expanded account summary row.
- Preserve SQLite and PostgreSQL compatibility.

**Non-Goals:**

- Do not add Dashboard secondary indicators.
- Do not implement MWR/TWR performance return calculations.
- Do not add fee calculators, tax-rate inputs, or fee subtypes.
- Do not edit production Neon data directly as part of local implementation.
- Do not backfill perfect holding rollback deltas for all historical transactions where the original write-time state is no longer reconstructable.

## Decisions

### Principal is an account aggregate

Add `accounts.principal` as a numeric account-native amount.

Alternatives considered:

- Derive principal by summing all deposit/withdraw transactions on read. This avoids an aggregate field, but every account list read would scan transactions and deletion semantics would still need side-effect tracking.
- Store separate gross deposits and withdrawals. This is useful for future analytics, but the current requirement needs net principal and cumulative PnL.

Rationale: the project already stores account-level `realizedPnl` as an aggregate for read performance. Principal follows the same pattern.

### Transaction deltas are stored on each transaction

Add write-time delta columns to transactions:

- `cashDelta`
- `principalDelta`
- `realizedPnl` (existing column continues as the realized-PnL delta)
- `holdingSharesDelta`
- `holdingCostDelta`
- `holdingMarketValueDelta`

Deletion applies the reverse of these deltas. For shares-mode holdings, `holdingCostDelta` stores total cost-basis delta, not average-cost delta. The current average cost can then be recomputed from current shares and total cost basis.

Alternatives considered:

- Recompute all account and holding state from the full transaction history after every delete. This is cleaner in theory, but manual holding edits, market price updates, and existing historical state make it a larger architectural change.
- Keep the current delete behavior and only delete records. This conflicts with the clarified requirement that deletes roll back side effects.

Rationale: delta storage is the smallest reliable change that supports deterministic rollback for new transactions.

### Fee is a transaction type

Add `fee` to the transaction type set. A fee transaction requires only account, amount, date, and optional note.

Fee effects:

- `cashDelta = -amount`
- `principalDelta = 0`
- `realizedPnl = -amount`
- no holding deltas

Rationale: fees, taxes, and platform charges are account-level cost drag. They should reduce realized PnL and cumulative PnL without changing principal.

### Buy-side fees count as realized-PnL cost drag

Existing buy/sell/dividend transaction fees remain in the form. Buy fees become negative realized PnL. Sell and dividend fees continue to reduce realized PnL through their existing net calculations.

Rationale: the user wants fee costs to be included in realized-PnL damage. This also makes realized plus unrealized PnL better reflect explicit transaction costs.

### Legacy rows are supported conservatively

Migration can default new delta columns to `0`. Existing rows will not have reliable write-time holding deltas. Deleting historical rows without deltas cannot fully rollback past holding/cash effects unless a best-effort migration is added later.

Rationale: preserving data integrity is more important than pretending exact historical rollback is possible where state was not stored.

## Risks / Trade-offs

- Historical transactions lack precise holding deltas -> New rollback semantics are exact for new transactions; legacy rows can be guarded or handled conservatively.
- Deleting an old transaction can make a holding negative -> Validate reverse deltas before applying and reject deletion with a clear error if it would create invalid shares, cost, or market value.
- Shares-mode market value is influenced by latest quote price -> Rollback position shares and cost basis, then recompute shares-mode market value from current price instead of restoring stale transaction-time price.
- Neon PostgreSQL migration can affect production data -> Generate and commit migration SQL, test against development Neon first, and only then apply to production using the existing operations guide.
- Buy-side fee realized-PnL behavior changes accounting output -> Document the changed realized-PnL definition in specs and tests.

## Migration Plan

1. Update Drizzle SQLite and PostgreSQL schemas.
2. Generate or add SQLite and PostgreSQL migrations:
   - `accounts.principal` default `0`
   - transaction delta columns default `0`
   - transaction type remains text/varchar and does not need a database enum migration in PostgreSQL.
3. For existing accounts, initialize `principal` to the current `cashBalance` unless a safer project-specific backfill is defined later.
4. For existing transactions, initialize delta columns to `0` to avoid unsafe inferred rollback.
5. Verify locally with SQLite.
6. Verify PostgreSQL migration against a Neon development database.
7. Apply to production Neon only after dev verification succeeds.
