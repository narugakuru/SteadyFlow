PRAGMA foreign_keys=off;
--> statement-breakpoint
CREATE TABLE `accounts_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`cash_balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `accounts_new` (`id`, `user_id`, `name`, `currency`, `cash_balance`, `created_at`, `updated_at`)
SELECT `id`, `user_id`, `name`, `currency`, `cash_balance`, `created_at`, `updated_at` FROM `accounts`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
ALTER TABLE `accounts_new` RENAME TO `accounts`;
--> statement-breakpoint
CREATE TABLE `asset_classes_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_pct` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `asset_classes_new` (`id`, `user_id`, `name`, `target_pct`)
SELECT `id`, `user_id`, `name`, `target_pct` FROM `asset_classes`;
--> statement-breakpoint
DROP TABLE `asset_classes`;
--> statement-breakpoint
ALTER TABLE `asset_classes_new` RENAME TO `asset_classes`;
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_classes_user_name_idx` ON `asset_classes` (`user_id`, `name`);
--> statement-breakpoint
CREATE TABLE `settings_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `settings_new` (`id`, `user_id`, `key`, `value`)
SELECT `id`, `user_id`, `key`, `value` FROM `settings`;
--> statement-breakpoint
DROP TABLE `settings`;
--> statement-breakpoint
ALTER TABLE `settings_new` RENAME TO `settings`;
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_key_idx` ON `settings` (`user_id`, `key`);
--> statement-breakpoint
CREATE TABLE `snapshots_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`total_asset_cny` real NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `snapshots_new` (`id`, `user_id`, `date`, `total_asset_cny`, `data_json`, `created_at`)
SELECT `id`, `user_id`, `date`, `total_asset_cny`, `data_json`, `created_at` FROM `snapshots`;
--> statement-breakpoint
DROP TABLE `snapshots`;
--> statement-breakpoint
ALTER TABLE `snapshots_new` RENAME TO `snapshots`;
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_user_date_idx` ON `snapshots` (`user_id`, `date`);
--> statement-breakpoint
PRAGMA foreign_keys=on;
