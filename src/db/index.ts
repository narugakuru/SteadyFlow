import path from "path";
import fs from "fs";

const dbType = process.env.DB_TYPE || "sqlite";
let pgInitPromise: Promise<void> | null = null;

function runPostgresInit(sql: (query: string) => Promise<unknown>) {
  const initPath = path.join(process.cwd(), "drizzle-pg", "init.sql");
  if (!fs.existsSync(initPath)) {
    return Promise.resolve();
  }

  const raw = fs.readFileSync(initPath, "utf8");
  const statements = raw
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  return (async () => {
    for (const statement of statements) {
      await sql(statement);
    }
  })();
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
    const pgSchema = require("./schema-pg");

    const sql = neon(databaseUrl);
    pgInitPromise = runPostgresInit(sql);
    return drizzle(sql, { schema: pgSchema });
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
if (dbType === "postgres") {
  if (pgInitPromise) {
    pgInitPromise
      .then(() => seed(db))
      .catch((error) => {
        console.error("Postgres init failed:", error);
      });
  } else {
    seed(db);
  }
} else {
  seed(db);
}
