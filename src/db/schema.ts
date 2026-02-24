import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  currency: text("currency", { enum: ["CNY", "USD", "HKD"] }).notNull(),
  totalBalance: real("total_balance").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ticker: text("ticker"),
  valuationMode: text("valuation_mode", { enum: ["amount", "shares"] }).notNull().default("amount"),
  cost: real("cost").notNull().default(0),
  marketValue: real("market_value").notNull().default(0),
  shares: real("shares").notNull().default(0),
  price: real("price").notNull().default(0),
  assetClass: text("asset_class").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const assetClasses = sqliteTable("asset_classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  targetPct: real("target_pct").notNull().default(0),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const exchangeRates = sqliteTable("exchange_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currencyPair: text("currency_pair").notNull().unique(),
  rate: real("rate").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  totalAssetCny: real("total_asset_cny").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  holdingId: integer("holding_id")
    .references(() => holdings.id, { onDelete: "set null" }),
  type: text("type", { enum: ["buy", "sell", "dividend", "deposit", "withdraw"] }).notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  shares: real("shares"),
  price: real("price"),
  fee: real("fee").notNull().default(0),
  affectBalance: integer("affect_balance").notNull().default(1),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
