/* eslint-disable no-console */
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_TABLES = ["accounts", "asset_classes", "snapshots", "settings"];

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
