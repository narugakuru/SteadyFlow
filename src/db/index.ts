import path from "path";
import fs from "fs";
import { runRuntimeMaintenance } from "./runtime-maintenance";

const dbType = process.env.DB_TYPE || "sqlite";
let pgMigratePromise: Promise<void> | null = null;
const PG_MIGRATIONS_SCHEMA = "drizzle";
const PG_MIGRATIONS_TABLE = "__drizzle_migrations";

async function shouldResetPgMigrationState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sqlClient: any
): Promise<boolean> {
  const appTablesResult = await sqlClient`
    select count(*)::int as table_count
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'accounts',
        'asset_classes',
        'auth_accounts',
        'discipline_notes',
        'exchange_rates',
        'holdings',
        'sessions',
        'settings',
        'netvalue',
        'transactions',
        'users',
        'verification_tokens'
      )
  `;

  const existingAppTables = Number(appTablesResult?.[0]?.table_count ?? 0);
  if (existingAppTables > 0) {
    return false;
  }

  const migrationRowsResult = await sqlClient`
    select count(*)::int as migration_count
    from "drizzle"."__drizzle_migrations"
  `;

  const migrationRows = Number(migrationRowsResult?.[0]?.migration_count ?? 0);
  return migrationRows > 0;
}

async function preparePostgresMigrations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sqlClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  migrate: any,
  migrationsFolder: string
) {
  await sqlClient`create schema if not exists "drizzle"`;
  await sqlClient`
    create table if not exists "drizzle"."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const resetMigrationState = await shouldResetPgMigrationState(sqlClient);
  if (resetMigrationState) {
    console.warn(
      "[db] Detected empty public schema with stale drizzle migration records. Resetting migration history."
    );
    await sqlClient`truncate table "drizzle"."__drizzle_migrations"`;
  }

  await migrate(db, {
    migrationsFolder,
    migrationsSchema: PG_MIGRATIONS_SCHEMA,
    migrationsTable: PG_MIGRATIONS_TABLE,
  });
}

// Dynamically create the correct db instance based on DB_TYPE
function createDb() {
  if (dbType === "postgres") {
    // PostgreSQL (Neon serverless HTTP)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DB_TYPE=postgres requires DATABASE_URL to be set");
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require("@neondatabase/serverless");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/neon-http");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { migrate } = require("drizzle-orm/neon-http/migrator");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pgSchema = require("./schema-pg");

    const sql = neon(databaseUrl);
    const db = drizzle(sql, { schema: pgSchema });

    // Auto-migrate PostgreSQL
    const migrationsFolder = path.join(process.cwd(), "drizzle-pg");
    if (fs.existsSync(migrationsFolder)) {
      pgMigratePromise = preparePostgresMigrations(db, sql, migrate, migrationsFolder);
    }

    return db;
  } else {
    // SQLite (better-sqlite3)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqliteSchema = require("./schema-sqlite");

    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, "invest.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema: sqliteSchema });

    // Auto-migrate SQLite
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
    }

    return db;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createDb();
export const isPostgres = dbType === "postgres";

// Run seed (async-safe)
import { seed } from "./seed";
async function initializeDatabase() {
  await seed(db);
  await runRuntimeMaintenance(db);
}

if (dbType === "postgres" && pgMigratePromise) {
  (pgMigratePromise as Promise<void>)
    .then(() => initializeDatabase())
    .catch((error: unknown) => {
      console.error("Postgres startup init failed:", error);
    });
} else {
  initializeDatabase().catch((error: unknown) => {
    console.error("Database startup init failed:", error);
  });
}
