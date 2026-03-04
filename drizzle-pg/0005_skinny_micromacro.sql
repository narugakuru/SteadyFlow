ALTER TABLE "accounts" ADD COLUMN "realized_pnl" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "realized_pnl" double precision DEFAULT 0 NOT NULL;