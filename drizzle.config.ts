import { defineConfig } from "drizzle-kit";

// 本地开发专用（SQLite）
// Vercel/PG 使用 drizzle.config.pg.ts
export default defineConfig({
  schema: "./src/db/schema-sqlite.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/invest.db",
  },
});
