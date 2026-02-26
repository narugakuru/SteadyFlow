import { pgTable, serial, integer, text, doublePrecision, boolean, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  cashBalance: doublePrecision("cash_balance").notNull().default(0),
  totalCost: doublePrecision("total_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ticker: text("ticker"),
  valuationMode: varchar("valuation_mode", { length: 10 }).notNull().default("amount"),
  cost: doublePrecision("cost").notNull().default(0),
  marketValue: doublePrecision("market_value").notNull().default(0),
  shares: doublePrecision("shares").notNull().default(0),
  price: doublePrecision("price").notNull().default(0),
  assetClass: text("asset_class").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const assetClasses = pgTable("asset_classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  targetPct: doublePrecision("target_pct").notNull().default(0),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currencyPair: text("currency_pair").notNull().unique(),
  rate: doublePrecision("rate").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  totalAssetCny: doublePrecision("total_asset_cny").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  holdingId: integer("holding_id")
    .references(() => holdings.id, { onDelete: "set null" }),
  type: varchar("type", { length: 20 }).notNull(),
  date: text("date").notNull(),
  amount: doublePrecision("amount").notNull(),
  shares: doublePrecision("shares"),
  price: doublePrecision("price"),
  fee: doublePrecision("fee").notNull().default(0),
  affectCash: boolean("affect_cash").notNull().default(true),
  affectHolding: boolean("affect_holding").notNull().default(true),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});
