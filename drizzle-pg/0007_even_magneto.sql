ALTER TABLE "accounts" ADD COLUMN "principal" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "accounts" SET "principal" = "cash_balance";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cash_delta" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "principal_delta" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "holding_shares_delta" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "holding_cost_delta" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "holding_market_value_delta" double precision DEFAULT 0 NOT NULL;
