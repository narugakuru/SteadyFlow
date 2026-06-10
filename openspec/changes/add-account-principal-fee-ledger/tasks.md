## 1. Schema and Migration

- [ ] 1.1 Add account principal and transaction delta columns to SQLite and PostgreSQL Drizzle schemas.
- [ ] 1.2 Add SQLite migration for account principal and transaction delta columns.
- [ ] 1.3 Add PostgreSQL migration for account principal and transaction delta columns.
- [ ] 1.4 Confirm migrations are safe for Neon dev verification before production application.

## 2. Transaction Ledger Behavior

- [ ] 2.1 Add `fee` to shared transaction types, labels, filters, and transaction form options.
- [ ] 2.2 Compute and persist transaction deltas for buy, sell, dividend, deposit, withdraw, and fee writes.
- [ ] 2.3 Update account principal and realized PnL aggregates during transaction creation.
- [ ] 2.4 Implement transaction deletion rollback using stored deltas with invalid rollback guards.
- [ ] 2.5 Preserve SQLite transaction behavior and PostgreSQL atomic batch behavior.

## 3. Account Principal and Cumulative PnL UI

- [ ] 3.1 Add principal to account create/edit API responses and writes.
- [ ] 3.2 Add principal to shared account types and account form fields.
- [ ] 3.3 Add cumulative PnL amount and percentage to the expanded account summary after total value, holdings, and cash.
- [ ] 3.4 Keep existing account-list holding PnL display unchanged.

## 4. Specs, Docs, and Verification

- [ ] 4.1 Sync implemented behavior to main OpenSpec specs.
- [ ] 4.2 Update project overview and technical project notes for data model changes.
- [ ] 4.3 Add or update focused tests/scripts for transaction deltas, fee realized PnL, principal, and delete rollback.
- [ ] 4.4 Run typecheck/lint and relevant regression tests.
