import { defineConfig } from "drizzle-kit";

const dbType = process.env.DB_TYPE || "sqlite";

export default dbType === "postgres"
  ? defineConfig({
      schema: "./src/db/schema-pg.ts",
      out: "./drizzle-pg",
      dialect: "postgresql",
      dbCredentials: {
        url: process.env.DATABASE_URL!,
      },
    })
  : defineConfig({
      schema: "./src/db/schema-sqlite.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: {
        url: "./data/invest.db",
      },
    });
