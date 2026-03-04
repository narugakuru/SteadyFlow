import { randomUUID } from "crypto";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("free"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (token) => ({
    compoundKey: primaryKey({ columns: [token.identifier, token.token] }),
  })
);

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency", { enum: ["CNY", "USD", "HKD"] }).notNull(),
  cashBalance: real("cash_balance").notNull().default(0),
  realizedPnl: real("realized_pnl").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ticker: text("ticker"),
  valuationMode: text("valuation_mode", { enum: ["amount", "shares"] })
    .notNull()
    .default("amount"),
  cost: real("cost").notNull().default(0),
  marketValue: real("market_value").notNull().default(0),
  shares: real("shares").notNull().default(0),
  price: real("price").notNull().default(0),
  assetClass: text("asset_class").notNull(),
  accountSortOrder: integer("account_sort_order").notNull().default(999),
  disciplineSortOrder: integer("discipline_sort_order").notNull().default(999),
  memo: text("memo"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const disciplineNotes = sqliteTable(
  "discipline_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    quote: text("quote").notNull(),
    plan: text("plan").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    userUpdatedAtIdx: index("discipline_notes_user_updated_at_idx").on(
      table.userId,
      table.updatedAt
    ),
  })
);

export const assetClasses = sqliteTable(
  "asset_classes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetPct: real("target_pct").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(999),
  },
  (table) => ({
    userNameUnique: uniqueIndex("asset_classes_user_name_idx").on(table.userId, table.name),
  })
);

export const settings = sqliteTable(
  "settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => ({
    userKeyUnique: uniqueIndex("settings_user_key_idx").on(table.userId, table.key),
  })
);

export const exchangeRates = sqliteTable("exchange_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currencyPair: text("currency_pair").notNull().unique(),
  rate: real("rate").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const netvalue = sqliteTable(
  "netvalue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    totalAssetCny: real("total_asset_cny").notNull(),
    dataJson: text("data_json").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    userDateUnique: uniqueIndex("netvalue_user_date_idx").on(table.userId, table.date),
  })
);

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  holdingId: integer("holding_id").references(() => holdings.id, { onDelete: "set null" }),
  type: text("type", { enum: ["buy", "sell", "dividend", "deposit", "withdraw"] }).notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  realizedPnl: real("realized_pnl").notNull().default(0),
  shares: real("shares"),
  price: real("price"),
  fee: real("fee").notNull().default(0),
  affectCash: integer("affect_cash").notNull().default(1),
  affectHolding: integer("affect_holding").notNull().default(1),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
