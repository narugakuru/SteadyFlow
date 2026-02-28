import { randomUUID } from "crypto";
import {
  pgTable,
  serial,
  integer,
  text,
  doublePrecision,
  varchar,
  timestamp,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").notNull().default("user"),
  plan: text("plan").notNull().default("free"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const authAccounts = pgTable(
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

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (token) => ({
    compoundKey: primaryKey({ columns: [token.identifier, token.token] }),
  })
);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  cashBalance: doublePrecision("cash_balance").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
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
  accountSortOrder: integer("account_sort_order").notNull().default(999),
  disciplineSortOrder: integer("discipline_sort_order").notNull().default(999),
  memo: text("memo"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const disciplineNotes = pgTable(
  "discipline_notes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    quote: text("quote").notNull(),
    plan: text("plan").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userUpdatedAtIdx: index("discipline_notes_user_updated_at_idx").on(
      table.userId,
      table.updatedAt
    ),
  })
);

export const assetClasses = pgTable(
  "asset_classes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetPct: doublePrecision("target_pct").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(999),
  },
  (table) => ({
    userNameUnique: uniqueIndex("asset_classes_user_name_idx").on(table.userId, table.name),
  })
);

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
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

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currencyPair: text("currency_pair").notNull().unique(),
  rate: doublePrecision("rate").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const netvalue = pgTable(
  "netvalue",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    totalAssetCny: doublePrecision("total_asset_cny").notNull(),
    dataJson: text("data_json").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userDateUnique: uniqueIndex("netvalue_user_date_idx").on(table.userId, table.date),
  })
);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  holdingId: integer("holding_id").references(() => holdings.id, { onDelete: "set null" }),
  type: varchar("type", { length: 20 }).notNull(),
  date: text("date").notNull(),
  amount: doublePrecision("amount").notNull(),
  shares: doublePrecision("shares"),
  price: doublePrecision("price"),
  fee: doublePrecision("fee").notNull().default(0),
  affectCash: integer("affect_cash").notNull().default(1),
  affectHolding: integer("affect_holding").notNull().default(1),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});
