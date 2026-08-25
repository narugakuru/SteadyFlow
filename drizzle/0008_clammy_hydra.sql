ALTER TABLE `transactions` ADD `transfer_group_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `counterparty_account_id` integer;--> statement-breakpoint
CREATE INDEX `transactions_transfer_group_idx` ON `transactions` (`transfer_group_id`);