/* eslint-disable no-console */
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_TABLES = ["accounts", "asset_classes", "snapshots", "settings"];
const ENV_PATH = path.join(process.cwd(), ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function migrateSqlite(email, password) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");

  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "invest.db");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const existing = db
    .prepare("SELECT id, role FROM users WHERE email = ? LIMIT 1")
    .get(email);

  let adminId = existing?.id;
  if (existing) {
    if (existing.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
    }
  } else {
    adminId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, email, password, role, plan, created_at) VALUES (?, ?, ?, 'admin', 'free', ?)"
    ).run(adminId, email, hashedPassword, createdAt);
  }

  for (const table of DEFAULT_TABLES) {
    db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(adminId);
  }

  db.close();
  return adminId;
}

async function migratePostgres(email, password) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DB_TYPE=postgres requires DATABASE_URL to be set");
  }

  const sql = neon(databaseUrl);

  const existing = await sql`SELECT id, role FROM users WHERE email = ${email} LIMIT 1`;
  let adminId = existing[0]?.id;

  if (existing.length > 0) {
    if (existing[0].role !== "admin") {
      await sql`UPDATE users SET role = 'admin' WHERE id = ${adminId}`;
    }
  } else {
    adminId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    await sql`
      INSERT INTO users (id, email, password, role, plan, created_at)
      VALUES (${adminId}, ${email}, ${hashedPassword}, 'admin', 'free', ${createdAt})
    `;
  }

  for (const table of DEFAULT_TABLES) {
    await sql`UPDATE ${sql.unsafe(table)} SET user_id = ${adminId} WHERE user_id IS NULL`;
  }

  return adminId;
}

async function main() {
  loadEnvFile();

  const email = (process.env.DEFAULT_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set.");
  }

  const dbType = process.env.DB_TYPE || "sqlite";

  const adminId = dbType === "postgres"
    ? await migratePostgres(email, password)
    : await migrateSqlite(email, password);

  console.log("User data migration complete. Default admin:", email, "id:", adminId);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
