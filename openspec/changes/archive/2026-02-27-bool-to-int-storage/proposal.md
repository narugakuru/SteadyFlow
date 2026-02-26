## Why

The transactions API currently binds JavaScript booleans into SQLite, which rejects boolean parameter types and throws runtime errors. We need a consistent, database-agnostic representation of boolean fields so SQLite and PostgreSQL behave the same and writes never fail.

## What Changes

- Normalize boolean-like fields to integer `0/1` storage across SQLite and PostgreSQL schemas where used (e.g., transaction side-effect flags).
- Add write-time conversion to map `true/false` to `1/0`, and read-time normalization where needed to preserve existing API behavior.
- Provide migration/backfill steps to convert any existing boolean values to `0/1` in both SQLite and PostgreSQL.

## Capabilities

### New Capabilities

- `none`: no new end-user capability; this is a data consistency fix.

### Modified Capabilities

- `dual-database`: standardize boolean storage across SQLite/PostgreSQL to avoid type binding errors.

## Impact

- Database schemas (`schema-sqlite.ts`, `schema-pg.ts`) and related migrations.
- Transaction API write paths (e.g., `/api/transactions`) and any other boolean fields persisted.
- Seed/migration scripts and any queries that rely on boolean typing.
