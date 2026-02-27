/**
 * 数据迁移：cost 字段语义变更（shares 模式）
 *
 * 将 shares 模式持仓的 cost 从"总成本"转为"平均每股成本"
 * 公式：cost = cost / shares（仅 shares > 0 时执行）
 *
 * 用法：node scripts/migrate-cost-to-avgcost.js
 * 需要 .env 中配置 DB_TYPE（默认 sqlite）和 DATABASE_URL（postgres 模式）
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const ENV_PATH = path.join(process.cwd(), ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const MIGRATE_SQL =
  "UPDATE holdings SET cost = cost / shares WHERE shares > 0 AND valuation_mode = 'shares'";

async function migrateSqlite() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "invest.db");
  if (!fs.existsSync(dbPath)) {
    console.log("SQLite database not found, skipping.");
    return;
  }
  const db = new Database(dbPath);
  const result = db.prepare(MIGRATE_SQL).run();
  db.close();
  console.log(`SQLite: ${result.changes} rows updated.`);
}

async function migratePostgres() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DB_TYPE=postgres requires DATABASE_URL to be set");
  }
  const sql = neon(databaseUrl);
  const result = await sql`
    UPDATE holdings SET cost = cost / shares
    WHERE shares > 0 AND valuation_mode = 'shares'
  `;
  console.log(`PostgreSQL: ${result.length ?? 0} rows updated.`);
}

async function main() {
  loadEnvFile();
  const dbType = process.env.DB_TYPE || "sqlite";
  console.log(`Migrating cost field (DB_TYPE=${dbType})...`);

  if (dbType === "postgres") {
    await migratePostgres();
  } else {
    await migrateSqlite();
  }

  console.log("Migration complete: cost now stores avg cost per share for shares mode holdings.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
