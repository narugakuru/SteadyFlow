ALTER TABLE `accounts` ADD `realized_pnl` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `realized_pnl` real DEFAULT 0 NOT NULL;