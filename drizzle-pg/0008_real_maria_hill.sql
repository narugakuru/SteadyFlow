ALTER TABLE "transactions" ADD COLUMN "transfer_group_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "counterparty_account_id" integer;--> statement-breakpoint
CREATE INDEX "transactions_transfer_group_idx" ON "transactions" USING btree ("transfer_group_id");