import { defineConfig } from "drizzle-kit";

// Vercel + Neon PostgreSQL 专用
// 本地开发使用 drizzle.config.ts（SQLite）
export default defineConfig({
  schema: "./src/db/schema-pg.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
