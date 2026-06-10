ALTER TABLE `accounts` ADD `principal` real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `accounts` SET `principal` = `cash_balance`;--> statement-breakpoint
ALTER TABLE `transactions` ADD `cash_delta` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `principal_delta` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `holding_shares_delta` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `holding_cost_delta` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `holding_market_value_delta` real DEFAULT 0 NOT NULL;
