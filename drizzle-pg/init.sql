CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "password" text,
  "role" text NOT NULL DEFAULT 'user',
  "plan" text NOT NULL DEFAULT 'free',
  "created_at" text NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "currency" varchar(3) NOT NULL,
  "cash_balance" double precision NOT NULL DEFAULT 0,
  "created_at" text NOT NULL DEFAULT now(),
  "updated_at" text NOT NULL DEFAULT now(),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "holdings" (
  "id" serial PRIMARY KEY NOT NULL,
  "account_id" integer NOT NULL,
  "name" text NOT NULL,
  "ticker" text,
  "valuation_mode" varchar(10) NOT NULL DEFAULT 'amount',
  "cost" double precision NOT NULL DEFAULT 0,
  "market_value" double precision NOT NULL DEFAULT 0,
  "shares" double precision NOT NULL DEFAULT 0,
  "price" double precision NOT NULL DEFAULT 0,
  "asset_class" text NOT NULL,
  "created_at" text NOT NULL DEFAULT now(),
  "updated_at" text NOT NULL DEFAULT now(),
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "account_id" integer NOT NULL,
  "holding_id" integer,
  "type" varchar(20) NOT NULL,
  "date" text NOT NULL,
  "amount" double precision NOT NULL,
  "shares" double precision,
  "price" double precision,
  "fee" double precision NOT NULL DEFAULT 0,
  "affect_cash" integer NOT NULL DEFAULT 1,
  "affect_holding" integer NOT NULL DEFAULT 1,
  "note" text,
  "created_at" text NOT NULL DEFAULT now(),
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE cascade,
  FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE set null
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_accounts" (
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "provider_account_id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "expires" timestamp NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_classes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "target_pct" double precision NOT NULL DEFAULT 0,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" serial PRIMARY KEY NOT NULL,
  "currency_pair" text NOT NULL UNIQUE,
  "rate" double precision NOT NULL,
  "updated_at" text NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "date" text NOT NULL,
  "total_asset_cny" double precision NOT NULL,
  "data_json" text NOT NULL,
  "created_at" text NOT NULL DEFAULT now(),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_classes_user_name_idx" ON "asset_classes" ("user_id", "name");
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "settings_user_key_idx" ON "settings" ("user_id", "key");
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "snapshots_user_date_idx" ON "snapshots" ("user_id", "date");
