## Context

Transactions contain boolean-like flags (`affectCash`, `affectHolding`). SQLite stores them as integer 0/1, but the API can currently pass JavaScript booleans directly. SQLite rejects boolean parameter types at bind-time, causing 500 errors. PostgreSQL currently uses native `boolean` columns, which diverges from SQLite and complicates cross-db compatibility.

## Goals / Non-Goals

**Goals:**
- Store boolean-like fields as integer `0/1` in both SQLite and PostgreSQL.
- Normalize write paths so DB inserts/updates never bind JS booleans.
- Preserve existing API behavior (responses still expose booleans).

**Non-Goals:**
- Redesigning transaction logic or UI flows.
- Changing semantics of `affectCash` / `affectHolding` beyond storage format.

## Decisions

- **Use integer columns for boolean-like fields in PostgreSQL.**
  - Change `transactions.affect_cash` and `transactions.affect_holding` from `boolean` to `integer` with default `1`.
  - Rationale: aligns with SQLite storage and avoids driver differences.
  - Alternative: keep `boolean` in PG and only coerce in SQLite writes. Rejected because it preserves divergent schema semantics and increases long-term complexity.

- **Normalize booleans at the API boundary.**
  - Introduce a small helper (e.g., `toDbBool(value): 0 | 1`) used by all writes for these fields.
  - Convert DB values to booleans when building API responses (e.g., `fromDbBool(value): boolean`).
  - Rationale: ensures consistent behavior and makes intent explicit in code.

- **Migration strategy for existing data.**
  - PostgreSQL: `ALTER TABLE ... TYPE integer USING (CASE WHEN affect_cash THEN 1 ELSE 0 END)` and same for `affect_holding`; set defaults to `1`.
  - SQLite: ensure columns remain integer; run a safety update to coerce any truthy values into `0/1`.

## Risks / Trade-offs

- [Risk] Any code path expecting booleans from the DB may break if it receives `0/1`.
  → Mitigation: centralize conversion in API responses and update any direct DB reads.
- [Risk] Migration on large tables could be slow.
  → Mitigation: use simple `ALTER ... USING` in PG and a single `UPDATE` in SQLite.

## Migration Plan

1. Update `schema-pg.ts` to use integer columns for `affect_cash` and `affect_holding` (default `1`).
2. Since databases are manually reset on each run, no drizzle migrations are added; rely on clean initialization.
3. Update API write paths to call `toDbBool` for these fields.
4. Update API response mapping to ensure booleans are returned.
5. Verify on both DB types with a sample transaction insert and read.

## Open Questions

- Are there any other boolean-like fields that should be normalized to `0/1` in both schemas?
