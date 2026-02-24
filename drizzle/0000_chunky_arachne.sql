CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`total_balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asset_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_pct` real DEFAULT 0 NOT NULL,
	`warning_threshold` real DEFAULT 3 NOT NULL,
	`danger_threshold` real DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_classes_name_unique` ON `asset_classes` (`name`);--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency_pair` text NOT NULL,
	`rate` real NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exchange_rates_currency_pair_unique` ON `exchange_rates` (`currency_pair`);--> statement-breakpoint
CREATE TABLE `holdings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`name` text NOT NULL,
	`market_value` real DEFAULT 0 NOT NULL,
	`asset_class` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_asset_cny` real NOT NULL,
	`data_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_date_unique` ON `snapshots` (`date`);