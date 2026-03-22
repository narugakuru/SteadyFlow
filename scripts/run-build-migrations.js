/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("child_process");

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const isVercelBuild = process.env.VERCEL === "1";
const dbType = process.env.DB_TYPE || "sqlite";

if (!isVercelBuild) {
  console.log("[build-migrations] Non-Vercel build detected, skipping deploy migrations.");
  process.exit(0);
}

if (dbType !== "postgres") {
  console.log(`[build-migrations] DB_TYPE=${dbType}, skipping Vercel PostgreSQL deploy migration.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[build-migrations] DB_TYPE=postgres requires DATABASE_URL during Vercel build.");
  process.exit(1);
}

console.log("[build-migrations] Running PostgreSQL deploy migrations...");
run("npm run db:migrate:pg");
run("npm run db:backfill:netvalue");
console.log("[build-migrations] PostgreSQL deploy migrations completed.");
