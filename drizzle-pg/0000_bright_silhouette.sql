CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" varchar(3) NOT NULL,
	"cash_balance" double precision DEFAULT 0 NOT NULL,
	"total_cost" double precision DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_pct" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "asset_classes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"currency_pair" text NOT NULL,
	"rate" double precision NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_currency_pair_unique" UNIQUE("currency_pair")
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"ticker" text,
	"valuation_mode" varchar(10) DEFAULT 'amount' NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"market_value" double precision DEFAULT 0 NOT NULL,
	"shares" double precision DEFAULT 0 NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"asset_class" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"total_asset_cny" double precision NOT NULL,
	"data_json" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "snapshots_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"holding_id" integer,
	"type" varchar(20) NOT NULL,
	"date" text NOT NULL,
	"amount" double precision NOT NULL,
	"shares" double precision,
	"price" double precision,
	"fee" double precision DEFAULT 0 NOT NULL,
	"affect_cash" boolean DEFAULT true NOT NULL,
	"affect_holding" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE set null ON UPDATE no action;