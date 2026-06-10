## Why

Current account profit reporting is based on realized plus unrealized PnL and estimates the invested principal from the current asset snapshot. This becomes inaccurate once users track deposits, withdrawals, standalone fees, and long-running account cash flows.

The application needs an explicit account principal ledger so each account can report lifetime cumulative PnL while preserving the existing holding PnL display.

## What Changes

- Add account-level `principal` in the account's native currency.
- Allow account create/edit flows to manually set `principal`.
- Automatically increase principal on deposit transactions and decrease principal on withdrawal transactions.
- Add a standalone `fee` transaction type for generic fee/tax/cost deductions.
- Count `fee` transactions as negative realized PnL and reduce account cash.
- Keep existing holding PnL amount and percentage displays.
- Add cumulative PnL amount and percentage to the expanded account summary after total value, holdings, and cash.
- Compute cumulative PnL as `accountValue - principal`; show cumulative PnL percentage only when `principal > 0`, otherwise show `--`.
- Change transaction deletion semantics so deleting transactions rolls back their cash, holding, principal, and realized-PnL side effects.
- Store transaction deltas for new writes so delete rollback is deterministic.
- Dashboard top-level metric area is not expanded with additional secondary indicators.

## Capabilities

### New Capabilities

- `account-principal-ledger`: Tracks account principal, cumulative PnL, fee deductions, and transaction side-effect deltas.

### Modified Capabilities

- `account-management`: Account create/edit and expanded account summaries include principal and cumulative PnL.
- `transaction-management`: Transaction types include `fee`; creation and deletion maintain principal, realized PnL, cash, and holding deltas.
- `realized-pnl-ledger`: Fee deductions and transaction delete rollback become part of realized-PnL maintenance.
- `dashboard`: Dashboard profit summary keeps its current scope and does not add principal-derived secondary indicators.

## Impact

- Database schema and migrations for SQLite and PostgreSQL.
- Transaction create/delete route handlers and transaction list filtering/display.
- Account create/edit API and account list API.
- Account form and expanded account summary UI.
- Shared TypeScript domain types.
- Portfolio snapshot/account read models that expose account principal and cumulative PnL.
- OpenSpec main specs and project overview.
