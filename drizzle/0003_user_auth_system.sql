CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`password` text,
	`role` text DEFAULT 'user' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY (`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY (`identifier`, `token`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `asset_classes` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `snapshots` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `settings` ADD `user_id` text REFERENCES `users`(`id`);
--> statement-breakpoint
DROP INDEX `asset_classes_name_unique`;
--> statement-breakpoint
DROP INDEX `settings_key_unique`;
--> statement-breakpoint
DROP INDEX `snapshots_date_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_classes_user_name_idx` ON `asset_classes` (`user_id`, `name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_key_idx` ON `settings` (`user_id`, `key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_user_date_idx` ON `snapshots` (`user_id`, `date`);
