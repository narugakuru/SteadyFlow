/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const BATCH_SIZE = 200;

function slimNetvalueDataJsonString(dataJson) {
  try {
    const parsed = JSON.parse(dataJson);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Object.prototype.hasOwnProperty.call(parsed, "accounts")
    ) {
      return null;
    }

    const allocation = Array.isArray(parsed.allocation) ? parsed.allocation : [];
    const rates =
      parsed.rates && typeof parsed.rates === "object" && !Array.isArray(parsed.rates)
        ? parsed.rates
        : {};

    return JSON.stringify({ allocation, rates });
  } catch {
    return null;
  }
}

async function migrateSqlite() {
  const Database = require("better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "invest.db");
  const sqlite = new Database(dbPath);

  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'netvalue' LIMIT 1")
    .get();

  if (!tableExists) {
    console.log("[netvalue-backfill] SQLite table netvalue does not exist, skipping.");
    sqlite.close();
    return 0;
  }

  const selectStmt = sqlite.prepare(
    "SELECT id, data_json AS dataJson FROM netvalue WHERE data_json LIKE '%\"accounts\"%' ORDER BY id ASC LIMIT ?"
  );
  const updateStmt = sqlite.prepare("UPDATE netvalue SET data_json = ? WHERE id = ?");

  let totalUpdated = 0;

  while (true) {
    const rows = selectStmt.all(BATCH_SIZE);
    if (rows.length === 0) break;

    const updateBatch = sqlite.transaction((batch) => {
      let updated = 0;
      for (const row of batch) {
        const nextDataJson = slimNetvalueDataJsonString(row.dataJson);
        if (!nextDataJson) continue;
        updateStmt.run(nextDataJson, row.id);
        updated += 1;
      }
      return updated;
    });

    totalUpdated += updateBatch(rows);
  }

  sqlite.close();
  return totalUpdated;
}

async function migratePostgres() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DB_TYPE=postgres requires DATABASE_URL to be set");
  }

  const { neon } = require("@neondatabase/serverless");
  const sql = neon(databaseUrl);
  const [{ exists } = { exists: null }] = await sql`
    select to_regclass('public.netvalue') as exists
  `;

  if (!exists) {
    console.log("[netvalue-backfill] PostgreSQL table netvalue does not exist, skipping.");
    return 0;
  }

  let totalUpdated = 0;

  while (true) {
    const rows = await sql`
      select id, data_json as "dataJson"
      from netvalue
      where data_json like '%"accounts"%'
      order by id asc
      limit ${BATCH_SIZE}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      const nextDataJson = slimNetvalueDataJsonString(row.dataJson);
      if (!nextDataJson) continue;

      await sql`
        update netvalue
        set data_json = ${nextDataJson}
        where id = ${row.id}
      `;
      totalUpdated += 1;
    }
  }

  return totalUpdated;
}

async function main() {
  const dbType = process.env.DB_TYPE || "sqlite";
  const updated = dbType === "postgres" ? await migratePostgres() : await migrateSqlite();
  console.log(`[netvalue-backfill] Updated ${updated} rows (DB_TYPE=${dbType}).`);
}

main().catch((error) => {
  console.error("[netvalue-backfill] Failed:", error);
  process.exit(1);
});
