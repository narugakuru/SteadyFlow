## 1. Schema & Migrations

- [x] 1.1 Update `src/db/schema-pg.ts` to use integer columns for `affect_cash` and `affect_holding` with default `1`.
- [x] 1.2 Skip migrations (DB is manually reset); ensure no new drizzle migration files are added.
- [x] 1.3 Remove any temporary migration artifacts created during implementation.

## 2. API Normalization

- [x] 2.1 Add a shared `toDbBool` / `fromDbBool` helper (e.g., in `src/lib/utils.ts`) for `0/1` conversion.
- [x] 2.2 Update `/api/transactions` write paths to persist `affectCash` / `affectHolding` via `toDbBool`.
- [x] 2.3 Ensure transaction read responses normalize `affectCash` / `affectHolding` to booleans via `fromDbBool`.

## 3. Verification

- [ ] 3.1 Verify on SQLite and PostgreSQL: create a transaction with `affectCash/affectHolding` true/false and confirm no bind errors and boolean responses.
